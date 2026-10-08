package org.anurag.research;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "app.jwt-secret=test-only-signing-secret-with-at-least-32-bytes",
    "app.cookie-secure=false", "app.allowed-origins=http://localhost:3000",
    "management.health.mail.enabled=false"
})
class HttpRuntimeIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { ApiIntegrationTest.database(properties); }
    @Autowired TestRestTemplate http;
    @MockitoBean JavaMailSender mail;

    @Test
    void runningServerExposesHealthAndConfiguredGoogleClient() {
        var health = http.getForEntity("/actuator/health", JsonNode.class);
        assertThat(health.getStatusCode().value()).isEqualTo(200);
        assertThat(health.getBody().get("status").asText()).isEqualTo("UP");
        var provider = http.getForEntity("/api/auth/providers", JsonNode.class);
        assertThat(provider.getStatusCode().value()).isEqualTo(200);
        assertThat(provider.getBody().get("application").asText()).isEqualTo("anurag-space-research-center");
        assertThat(provider.getBody().get("googleClientId").asText())
            .isEqualTo("985258970603-bj0jdb6q98u455c60fjhorh1n9opqbqn.apps.googleusercontent.com");
    }

    @Test
    void runningServerRequiresCsrfAndIssuesHttpOnlyGoogleChallenge() {
        var rejected = http.postForEntity("/api/auth/google/challenge", null, String.class);
        assertThat(rejected.getStatusCode().value()).isEqualTo(403);
        var bootstrap = http.getForEntity("/api/auth/csrf", JsonNode.class);
        assertThat(bootstrap.getStatusCode().value()).isEqualTo(200);
        String token = bootstrap.getBody().get("token").asText();
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.COOKIE, "XSRF-TOKEN=" + token);
        headers.set("X-XSRF-TOKEN", token);
        var challenge = http.exchange("/api/auth/google/challenge", HttpMethod.POST, new HttpEntity<>(headers), JsonNode.class);
        assertThat(challenge.getStatusCode().value()).isEqualTo(200);
        assertThat(challenge.getBody().get("nonce").asText()).matches("[a-f0-9]{64}");
        assertThat(challenge.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
            .contains("anurag_google_challenge=", "HttpOnly", "SameSite=Lax", "Path=/api/auth/google");
    }

    @Test
    void frontendRoutesArePublicWithoutExposingProtectedApi() {
        for (String route : new String[]{"/", "/privacy", "/terms", "/resources", "/profile", "/admin", "/index.html"}) {
            var response = http.getForEntity(route, String.class);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).contains("Frontend routing test fixture");
        }
        assertThat(http.getForEntity("/api/profiles/me", String.class).getStatusCode().value()).isEqualTo(401);
        assertThat(http.getForEntity("/api/budget", String.class).getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void runningServerRejectsAnonymousAccountsAndUntrustedOrigins() {
        for (String endpoint : new String[]{"/api/auth/me", "/api/profiles/me", "/api/projects", "/api/tasks", "/api/members", "/api/updates", "/api/notifications", "/api/learning", "/api/budget", "/api/access"}) {
            assertThat(http.getForEntity(endpoint, String.class).getStatusCode().value()).isEqualTo(401);
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin("https://untrusted.example");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        var response = http.exchange("/api/auth/google", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
    }
}
