package org.anurag.research;

import java.time.Instant;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.jwt-secret=test-only-signing-secret-with-at-least-32-bytes", "app.cookie-secure=false", "app.developer-email=owner@anurag.edu.in", "app.google-client-id=test-client.apps.googleusercontent.com", "management.health.mail.enabled=false"})
@AutoConfigureMockMvc
@Transactional
class GoogleAuthIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { ApiIntegrationTest.database(properties); }
    @Autowired MockMvc mvc;
    @Autowired Database database;
    @Autowired PasswordEncoder passwords;
    @MockitoBean JavaMailSender mail;
    @MockitoBean GoogleIdentityVerifier google;
    final String password = "Original-university-password-2026";

    @BeforeEach
    void configureGoogle() { when(google.clientId()).thenReturn("test-client.apps.googleusercontent.com"); }

    Cookie challenge() throws Exception {
        var response = mvc.perform(post("/api/auth/google/challenge").with(csrf())).andExpect(status().isOk()).andReturn().getResponse();
        String nonce = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.getContentAsString()).get("nonce").asText();
        assertThat(response.getHeader("Set-Cookie")).contains("HttpOnly").contains("SameSite=Lax");
        assertThat(nonce).matches("[a-f0-9]{64}");
        return new Cookie("anurag_google_challenge", nonce);
    }

    void identity(Cookie challenge, String subject, String email) {
        when(google.verify("valid-google-token")).thenReturn(new GoogleIdentityVerifier.Identity(subject, email, "Student", "Researcher", challenge.getValue()));
    }

    Cookie sessionCookie(MvcResult result) {
        String header = result.getResponse().getHeaders("Set-Cookie").stream().filter(value -> value.startsWith("anurag_session=")).findFirst().orElseThrow();
        assertThat(header).contains("HttpOnly");
        return new Cookie("anurag_session", header.substring("anurag_session=".length(), header.indexOf(';')));
    }

    UUID account(String email, boolean verified, String role) {
        UUID id = UUID.randomUUID();
        database.jdbc.sql("INSERT INTO accounts (id, email, password_hash, verified, role) VALUES (:id, :email, :password, :verified, :role)")
            .param("id", id).param("email", email).param("password", passwords.encode(password)).param("verified", verified).param("role", role).update();
        return id;
    }

    @Test
    void googleCreatesVerifiedStudentAndNonceCannotBeReplayed() throws Exception {
        Cookie challenge = challenge(); identity(challenge, "new-google-student", "googlestudent@anurag.edu.in");
        var result = mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\",\"role\":\"developer\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("student")).andExpect(jsonPath("$.profileComplete").value(false)).andExpect(jsonPath("$.profile.firstName").value("Student")).andReturn();
        mvc.perform(get("/api/auth/me").cookie(sessionCookie(result))).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("googlestudent@anurag.edu.in"));
        assertThat(database.account(database.accountId("googlestudent@anurag.edu.in")).get("verified")).isEqualTo(true);
        mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isUnauthorized());
        verifyNoInteractions(mail);
    }

    @Test
    void googleVerificationDoesNotActivateAPreRegisteredAttackersPassword() throws Exception {
        UUID id = account("pendinggoogle@anurag.edu.in", false, "student");
        Cookie challenge = challenge(); identity(challenge, "pending-google-user", "pendinggoogle@anurag.edu.in");
        mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isOk());
        assertThat(database.account(id).get("verified")).isEqualTo(true);
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"pendinggoogle@anurag.edu.in\",\"password\":\"" + password + "\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void linkingPreservesVerifiedAccountPermissionsAndPasswordAndRejectsAnotherSubject() throws Exception {
        account("existinggoogle@anurag.edu.in", true, "admin");
        var local = mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"existinggoogle@anurag.edu.in\",\"password\":\"" + password + "\"}")).andExpect(status().isOk()).andReturn();
        Cookie challenge = challenge(); identity(challenge, "existing-google-user", "existinggoogle@anurag.edu.in");
        mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("admin"));
        mvc.perform(get("/api/auth/me").cookie(sessionCookie(local))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"existinggoogle@anurag.edu.in\",\"password\":\"" + password + "\"}")).andExpect(status().isOk());
        Cookie next = challenge(); identity(next, "different-google-user", "existinggoogle@anurag.edu.in");
        mvc.perform(post("/api/auth/google").cookie(next).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isConflict());
    }

    @Test
    void csrfMissingExpiredAndMismatchedChallengesAndInvalidTokensAreRejected() throws Exception {
        mvc.perform(post("/api/auth/google/challenge")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/google").with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isUnauthorized());
        Cookie challenge = challenge(); identity(challenge, "challenge-user", "challenge@anurag.edu.in");
        mvc.perform(post("/api/auth/google").cookie(challenge).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isForbidden());
        when(google.verify("wrong-google-token")).thenThrow(new ResponseStatusException(UNAUTHORIZED, "Invalid token."));
        mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"wrong-google-token\"}")).andExpect(status().isUnauthorized());
        when(google.verify("valid-google-token")).thenReturn(new GoogleIdentityVerifier.Identity("challenge-user", "challenge@anurag.edu.in", "Student", "Researcher", "b".repeat(64)));
        mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isUnauthorized());
        identity(challenge, "challenge-user", "challenge@anurag.edu.in");
        database.jdbc.sql("UPDATE google_login_challenges SET expires_at = :expiry WHERE token_hash = :hash").param("expiry", java.sql.Timestamp.from(Instant.now().minusSeconds(30))).param("hash", AuthController.hash(challenge.getValue())).update();
        mvc.perform(post("/api/auth/google").cookie(challenge).with(csrf()).contentType("application/json").content("{\"credential\":\"valid-google-token\"}")).andExpect(status().isUnauthorized());
    }

    @Test
    void unconfiguredGoogleIsExplicitlyUnavailable() throws Exception {
        when(google.clientId()).thenReturn("");
        mvc.perform(get("/api/auth/providers")).andExpect(status().isOk()).andExpect(jsonPath("$.googleClientId").value(""));
        mvc.perform(post("/api/auth/google/challenge").with(csrf())).andExpect(status().isServiceUnavailable());
    }
}
