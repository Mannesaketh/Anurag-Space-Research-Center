package org.anurag.research;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

/**
 * Exchanges a Firebase Authentication ID token (from Firebase Google Sign-In in the browser)
 * for the backend's own httpOnly session cookie.
 *
 * Accounts are restricted to @anurag.edu.in by default. Additional exact email addresses
 * (e.g. developer test accounts) can be allowed with the EXTRA_ALLOWED_EMAILS setting.
 */
@RestController
@RequestMapping("/api/auth")
public class FirebaseAuthController {
    record IdToken(@NotBlank @Size(max = 10000) String idToken) {}

    private static final String UNIVERSITY_DOMAIN = "@anurag.edu.in";
    private final Database database;
    private final AuthController auth;
    private final PasswordEncoder passwords;
    private final String projectId;
    private final Set<String> extraAllowedEmails;
    private final NimbusJwtDecoder decoder;

    public FirebaseAuthController(Database database, AuthController auth, PasswordEncoder passwords,
            @Value("${app.firebase-project-id}") String projectId,
            @Value("${app.extra-allowed-emails}") String extraAllowedEmails) {
        this.database = database; this.auth = auth; this.passwords = passwords;
        this.projectId = projectId.strip();
        this.extraAllowedEmails = Arrays.stream(extraAllowedEmails.split(","))
            .map(value -> value.strip().toLowerCase(Locale.ROOT)).filter(value -> !value.isBlank()).collect(Collectors.toUnmodifiableSet());
        if (this.projectId.isBlank()) { this.decoder = null; return; }
        this.decoder = NimbusJwtDecoder
            .withJwkSetUri("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
            .jwsAlgorithm(SignatureAlgorithm.RS256).build();
        String issuer = "https://securetoken.google.com/" + this.projectId;
        this.decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(Duration.ofSeconds(30)), jwt -> {
            Object subject = jwt.getClaim("sub"), authTime = jwt.getClaim("auth_time");
            boolean valid = issuer.equals(jwt.getClaimAsString("iss"))
                && jwt.getAudience() != null && jwt.getAudience().size() == 1 && jwt.getAudience().contains(this.projectId)
                && subject instanceof String subjectValue && !subjectValue.isBlank() && subjectValue.length() <= 128
                && authTime != null && jwt.getIssuedAt() != null && jwt.getExpiresAt() != null
                && !jwt.getIssuedAt().isAfter(Instant.now().plusSeconds(30));
            return valid ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_firebase_token", "Invalid Firebase ID token.", null));
        }));
    }

    @PostMapping("/firebase")
    @Transactional
    Map<String, Object> login(@Valid @RequestBody IdToken input, HttpServletRequest request, HttpServletResponse response) {
        auth.limit(request);
        if (decoder == null) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Firebase sign-in is not configured. Set FIREBASE_PROJECT_ID.");
        Jwt jwt;
        try { jwt = decoder.decode(input.idToken()); }
        catch (JwtException | IllegalArgumentException error) { throw new ResponseStatusException(UNAUTHORIZED, "Firebase verification failed. Please sign in again."); }

        String email = allowedEmail(jwt);
        String subject = googleSubject(jwt);
        String[] names = splitName(jwt.getClaimAsString("name"));

        var existing = database.jdbc.sql("SELECT * FROM accounts WHERE email = :email OR google_subject = :subject ORDER BY email FOR UPDATE")
            .param("email", email).param("subject", subject).query().listOfRows();
        UUID id;
        if (existing.isEmpty()) {
            id = UUID.randomUUID();
            database.jdbc.sql("INSERT INTO accounts (id, email, password_hash, verified, role, google_subject, first_name, last_name) VALUES (:id, :email, :password, TRUE, :role, :subject, :first, :last)")
                .param("id", id).param("email", email).param("password", passwords.encode(UUID.randomUUID().toString())).param("role", auth.initialRole(email))
                .param("subject", subject).param("first", names[0]).param("last", names[1]).update();
        } else {
            var account = existing.getFirst();
            if (existing.size() != 1 || !email.equals(account.get("email")) || (account.get("google_subject") != null && !subject.equals(account.get("google_subject"))))
                throw new ResponseStatusException(CONFLICT, "This Google identity is linked to a different account. Contact your administrator.");
            id = Database.uuid(account.get("id"));
            String password = Boolean.TRUE.equals(account.get("verified")) ? account.get("password_hash").toString() : passwords.encode(UUID.randomUUID().toString());
            database.jdbc.sql("UPDATE accounts SET verified = TRUE, google_subject = :subject, password_hash = :password, session_version = session_version + 1 WHERE id = :id")
                .param("subject", subject).param("password", password).param("id", id).update();
        }
        database.jdbc.sql("DELETE FROM email_verifications WHERE account_id = :id").param("id", id).update();
        return auth.signIn(id, response);
    }

    private String allowedEmail(Jwt jwt) {
        String raw = jwt.getClaimAsString("email");
        if (raw == null || !Boolean.TRUE.equals(jwt.getClaim("email_verified")))
            throw new ResponseStatusException(UNAUTHORIZED, "A verified Google email is required.");
        String email = raw.strip().toLowerCase(Locale.ROOT);
        if (email.length() > 150) throw new ResponseStatusException(BAD_REQUEST, "Email address is too long.");
        if (email.endsWith(UNIVERSITY_DOMAIN)) return AuthController.universityEmail(email);
        if (extraAllowedEmails.contains(email)) return email;
        throw new ResponseStatusException(FORBIDDEN, "Use your @anurag.edu.in university Google account.");
    }

    /** Prefer the underlying Google account id so Firebase and direct Google sign-in map to the same account. */
    @SuppressWarnings("unchecked")
    private static String googleSubject(Jwt jwt) {
        if (jwt.getClaim("firebase") instanceof Map<?, ?> firebase && firebase.get("identities") instanceof Map<?, ?> identities
                && identities.get("google.com") instanceof List<?> google && !google.isEmpty() && google.getFirst() instanceof String sub && !sub.isBlank())
            return sub.length() <= 255 ? sub : sub.substring(0, 255);
        return "firebase:" + jwt.getSubject();
    }

    private static String[] splitName(String name) {
        if (name == null || name.isBlank()) return new String[] {"", ""};
        String[] parts = name.strip().split("\\s+", 2);
        return new String[] {limit(parts[0]), parts.length > 1 ? limit(parts[1]) : ""};
    }

    private static String limit(String value) { return value.substring(0, Math.min(60, value.length())); }
}
