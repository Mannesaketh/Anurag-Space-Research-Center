package org.anurag.research;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;

class GoogleIdentityVerifierTest {
    static final String clientId = "test-client.apps.googleusercontent.com";
    static final String nonce = "a".repeat(64);
    static GoogleIdentityVerifier verifier;
    static NimbusJwtEncoder encoder;

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        encoder = encoder(pair);
        verifier = new GoogleIdentityVerifier(clientId, NimbusJwtDecoder.withPublicKey((RSAPublicKey) pair.getPublic()).build());
    }

    static NimbusJwtEncoder encoder(KeyPair pair) {
        RSAKey key = new RSAKey.Builder((RSAPublicKey) pair.getPublic()).privateKey((RSAPrivateKey) pair.getPrivate()).keyID("google-test-key").build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));
    }

    static String token(Map<String, Object> overrides, NimbusJwtEncoder signingEncoder) {
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("https://accounts.google.com").subject("google-user-123").audience(List.of(clientId))
            .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(3600)).claim("email", "student@anurag.edu.in").claim("email_verified", true)
            .claim("hd", "anurag.edu.in").claim("nonce", nonce).claim("given_name", "Student").claim("family_name", "Researcher")
            .claims(values -> values.putAll(overrides)).build();
        return signingEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).keyId("google-test-key").build(), claims)).getTokenValue();
    }

    @Test
    void verifiedUniversityIdentityWithTrustedSignatureIsAccepted() {
        var identity = verifier.verify(token(Map.of(), encoder));
        assertThat(identity.email()).isEqualTo("student@anurag.edu.in"); assertThat(identity.subject()).isEqualTo("google-user-123");
        assertThat(identity.nonce()).isEqualTo(nonce); assertThat(identity.firstName()).isEqualTo("Student");
        assertThat(verifier.verify(token(Map.of("iss", "accounts.google.com"), encoder)).email()).isEqualTo(identity.email());
    }

    @Test
    void wrongIssuerAudienceDomainVerificationAndNonceAreRejected() {
        for (Map<String, Object> claims : List.<Map<String, Object>>of(Map.of("iss", "https://attacker.example"), Map.of("aud", List.of("other-client")),
            Map.of("azp", "other-client"), Map.of("aud", List.of(clientId, "other-client")), Map.of("hd", "other.edu.in"), Map.of("hd", ""), Map.of("email", "student@gmail.com"), Map.of("email_verified", false), Map.of("nonce", ""))) {
            assertThatThrownBy(() -> verifier.verify(token(claims, encoder))).isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(401));
        }
    }

    @Test
    void expiredAndFutureTokensAndUntrustedSignaturesAreRejected() throws Exception {
        for (Map<String, Object> claims : List.of(Map.<String, Object>of("exp", Instant.now().minusSeconds(300), "iat", Instant.now().minusSeconds(600)), Map.<String, Object>of("iat", Instant.now().plusSeconds(300))))
            assertThatThrownBy(() -> verifier.verify(token(claims, encoder))).isInstanceOf(ResponseStatusException.class);
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        String forged = token(Map.of(), encoder(generator.generateKeyPair()));
        assertThatThrownBy(() -> verifier.verify(forged)).isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(401));
    }

    @Test
    void missingConfigurationNeverAcceptsAToken() {
        assertThatThrownBy(() -> new GoogleIdentityVerifier("").verify("anything")).isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(503));
    }
}
