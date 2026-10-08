package org.anurag.research;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/auth")
public class GoogleAuthController {
    record Credential(@NotBlank @Size(max = 10000) String credential) {}
    private final Database database;
    private final AuthController auth;
    private final GoogleIdentityVerifier google;
    private final PasswordEncoder passwords;
    private final boolean secure;
    private final SecureRandom random = new SecureRandom();

    public GoogleAuthController(Database database, AuthController auth, GoogleIdentityVerifier google, PasswordEncoder passwords, @Value("${app.cookie-secure}") boolean secure) {
        this.database = database; this.auth = auth; this.google = google; this.passwords = passwords; this.secure = secure;
    }

    @GetMapping("/providers")
    Map<String, String> providers() { return Map.of("application", "anurag-space-research-center", "googleClientId", google.clientId()); }

    @PostMapping("/google/challenge")
    Map<String, String> challenge(HttpServletRequest request, HttpServletResponse response) {
        auth.limit(request);
        if (google.clientId().isBlank()) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Google sign-in is not configured.");
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String nonce = HexFormat.of().formatHex(bytes);
        database.jdbc.sql("DELETE FROM google_login_challenges WHERE expires_at < CURRENT_TIMESTAMP").update();
        database.jdbc.sql("INSERT INTO google_login_challenges (token_hash, expires_at) VALUES (:hash, :expiry)")
            .param("hash", AuthController.hash(nonce)).param("expiry", java.sql.Timestamp.from(Instant.now().plusSeconds(300))).update();
        response.addHeader(HttpHeaders.SET_COOKIE, challengeCookie(nonce, 300));
        return Map.of("nonce", nonce);
    }

    @PostMapping("/google")
    @Transactional
    Map<String, Object> login(@Valid @RequestBody Credential input, @CookieValue(value = "anurag_google_challenge", defaultValue = "") String nonce, HttpServletRequest request, HttpServletResponse response) {
        auth.limit(request);
        if (!nonce.matches("[a-f0-9]{64}")) throw new ResponseStatusException(UNAUTHORIZED, "Start a fresh Google sign-in attempt.");
        GoogleIdentityVerifier.Identity identity = google.verify(input.credential());
        if (!MessageDigest.isEqual(nonce.getBytes(StandardCharsets.UTF_8), identity.nonce().getBytes(StandardCharsets.UTF_8))) throw new ResponseStatusException(UNAUTHORIZED, "Google sign-in challenge did not match. Please retry.");
        var challenge = database.jdbc.sql("SELECT expires_at FROM google_login_challenges WHERE token_hash = :hash FOR UPDATE")
            .param("hash", AuthController.hash(nonce)).query(new ColumnMapRowMapper()).optional().orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Google sign-in expired or was already used. Please retry."));
        if (Database.instant(challenge.get("expires_at")).isBefore(Instant.now())) throw new ResponseStatusException(UNAUTHORIZED, "Google sign-in expired. Please retry.");
        String email = AuthController.universityEmail(identity.email());
        var existing = database.jdbc.sql("SELECT * FROM accounts WHERE email = :email OR google_subject = :subject ORDER BY email FOR UPDATE")
            .param("email", email).param("subject", identity.subject()).query().listOfRows();
        UUID id;
        if (existing.isEmpty()) {
            id = UUID.randomUUID();
            database.jdbc.sql("INSERT INTO accounts (id, email, password_hash, verified, role, google_subject, first_name, last_name) VALUES (:id, :email, :password, TRUE, :role, :subject, :first, :last)")
                .param("id", id).param("email", email).param("password", passwords.encode(UUID.randomUUID().toString())).param("role", auth.initialRole(email))
                .param("subject", identity.subject()).param("first", identity.firstName()).param("last", identity.lastName()).update();
        } else {
            var account = existing.getFirst();
            if (existing.size() != 1 || !email.equals(account.get("email")) || (account.get("google_subject") != null && !identity.subject().equals(account.get("google_subject")))) throw new ResponseStatusException(CONFLICT, "This Google identity is linked to a different account. Contact your administrator.");
            id = Database.uuid(account.get("id"));
            String password = Boolean.TRUE.equals(account.get("verified")) ? account.get("password_hash").toString() : passwords.encode(UUID.randomUUID().toString());
            database.jdbc.sql("UPDATE accounts SET verified = TRUE, google_subject = :subject, password_hash = :password, session_version = session_version + 1 WHERE id = :id")
                .param("subject", identity.subject()).param("password", password).param("id", id).update();
        }
        database.jdbc.sql("DELETE FROM email_verifications WHERE account_id = :id").param("id", id).update();
        database.jdbc.sql("DELETE FROM google_login_challenges WHERE token_hash = :hash").param("hash", AuthController.hash(nonce)).update();
        response.addHeader(HttpHeaders.SET_COOKIE, challengeCookie("", 0));
        return auth.signIn(id, response);
    }

    private String challengeCookie(String value, long seconds) {
        return ResponseCookie.from("anurag_google_challenge", value).httpOnly(true).secure(secure).sameSite("Lax").path("/api/auth/google").maxAge(Duration.ofSeconds(seconds)).build().toString();
    }
}
