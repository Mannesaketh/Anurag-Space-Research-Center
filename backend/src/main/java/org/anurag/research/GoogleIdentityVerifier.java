package org.anurag.research;

import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class GoogleIdentityVerifier {
    record Identity(String subject, String email, String firstName, String lastName, String nonce) {}
    private final String clientId;
    private final NimbusJwtDecoder decoder;

    @Autowired
    public GoogleIdentityVerifier(@Value("${app.google-client-id}") String clientId) {
        this(clientId, clientId.isBlank() ? null : NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").jwsAlgorithm(SignatureAlgorithm.RS256).build());
    }

    GoogleIdentityVerifier(String clientId, NimbusJwtDecoder decoder) {
        this.clientId = clientId.strip(); this.decoder = decoder;
        if (decoder != null) decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(Duration.ofSeconds(30)), jwt -> {
            Object issuer = jwt.getClaim("iss"), subject = jwt.getClaim("sub"), email = jwt.getClaim("email"), nonce = jwt.getClaim("nonce");
            boolean valid = ("https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer))
                && jwt.getAudience().contains(this.clientId) && (jwt.getAudience().size() == 1 || this.clientId.equals(jwt.getClaim("azp")))
                && (jwt.getClaim("azp") == null || this.clientId.equals(jwt.getClaim("azp")))
                && Boolean.TRUE.equals(jwt.getClaim("email_verified")) && "anurag.edu.in".equals(jwt.getClaim("hd"))
                && subject instanceof String subjectValue && !subjectValue.isBlank() && subjectValue.length() <= 255
                && email instanceof String emailValue && emailValue.toLowerCase(java.util.Locale.ROOT).endsWith("@anurag.edu.in")
                && nonce instanceof String nonceValue && nonceValue.matches("[a-f0-9]{64}")
                && jwt.getExpiresAt() != null && jwt.getIssuedAt() != null && !jwt.getIssuedAt().isAfter(Instant.now().plusSeconds(30));
            return valid ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_google_identity", "A verified university Google account is required.", null));
        }));
    }

    String clientId() { return clientId; }

    Identity verify(String credential) {
        if (decoder == null) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Google sign-in is not configured. Ask the developer to add GOOGLE_CLIENT_ID.");
        try {
            Jwt jwt = decoder.decode(credential);
            return new Identity(jwt.getSubject(), AuthController.universityEmail(jwt.getClaimAsString("email")), name(jwt.getClaim("given_name")), name(jwt.getClaim("family_name")), jwt.getClaimAsString("nonce"));
        } catch (JwtException | IllegalArgumentException error) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google verification failed. Use your verified @anurag.edu.in Google Workspace account and try again.");
        }
    }

    private static String name(Object claim) {
        if (!(claim instanceof String value)) return "";
        String trimmed = value.strip();
        return trimmed.substring(0, Math.min(60, trimmed.length()));
    }
}
