package org.anurag.research;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.jwt-secret=test-only-signing-secret-with-at-least-32-bytes", "app.cookie-secure=false", "app.developer-email=owner@anurag.edu.in", "management.health.mail.enabled=false"})
@AutoConfigureMockMvc
@Transactional
class CsrfIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { ApiIntegrationTest.database(properties); }
    @Autowired MockMvc mvc;
    @MockitoBean JavaMailSender mail;

    @Test
    void actualCsrfCookieAndHeaderAllowRegistrationAndMissingHeaderDoesNot() throws Exception {
        var bootstrap = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        String token = new com.fasterxml.jackson.databind.ObjectMapper().readTree(bootstrap.getContentAsString()).get("token").asText();
        Cookie cookie = new Cookie("XSRF-TOKEN", token);
        String body = "{\"email\":\"csrf@anurag.edu.in\",\"password\":\"Research-strong-password-2026\"}";
        mvc.perform(post("/api/auth/register").cookie(cookie).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/register").cookie(cookie).header("X-XSRF-TOKEN", token).contentType("application/json").content(body)).andExpect(status().isOk());
        assertThat(bootstrap.getCookie("XSRF-TOKEN")).isNotNull();
        assertThat(bootstrap.getCookie("XSRF-TOKEN").getAttribute("SameSite")).isEqualTo("Lax");
    }
}
