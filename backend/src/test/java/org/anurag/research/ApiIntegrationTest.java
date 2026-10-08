package org.anurag.research;

import java.io.IOException;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.jwt-secret=test-only-signing-secret-with-at-least-32-bytes", "app.cookie-secure=false", "app.developer-email=owner@anurag.edu.in", "management.health.mail.enabled=false"})
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named = "TEST_DATABASE_URL", matches = ".+", disabledReason = "Set TEST_DATABASE_URL (e.g. jdbc:mysql://localhost:3306/anurag_research_test) to run MySQL integration tests")
class ApiIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getenv("TEST_DATABASE_URL"));
        properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("TEST_DATABASE_USER", "root"));
        properties.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_DATABASE_PASSWORD", ""));
    }
    @Autowired MockMvc mvc;
    @Autowired Database database;
    @Autowired PasswordEncoder passwords;
    @MockitoBean JavaMailSender mail;
    final String password = "Research-strong-password-2026";

    UUID seed(String email, String role) {
        UUID id = UUID.randomUUID();
        database.jdbc.sql("INSERT INTO accounts (id, email, password_hash, verified, role) VALUES (:id, :email, :password, TRUE, :role)")
            .param("id", id).param("email", email).param("password", passwords.encode(password)).param("role", role).update();
        return id;
    }
    Cookie login(String email) throws Exception {
        var result = mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn();
        String header = result.getResponse().getHeader("Set-Cookie");
        assertThat(header).contains("HttpOnly").contains("SameSite=Lax");
        return new Cookie("anurag_session", header.substring("anurag_session=".length(), header.indexOf(';')));
    }

    @Test
    void anonymousAndMissingCsrfRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/updates")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType("application/json").content("{}")) .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andExpect(jsonPath("$.token").isString());
    }

    @Test
    void registrationRequiresUniversityEmailAndVerificationAndCannotChooseRole() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content("{\"email\":\"someone@example.org\",\"password\":\"" + password + "\"}")) .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content("{\"email\":\"student@anurag.edu.in\",\"password\":\"" + password + "\",\"role\":\"developer\"}")) .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"student@anurag.edu.in\",\"password\":\"" + password + "\"}")) .andExpect(status().isForbidden());
        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(sent.capture());
        String token = sent.getValue().getText().split("verify=")[1].substring(0, 64);
        mvc.perform(post("/api/auth/verify").with(csrf()).contentType("application/json").content("{\"token\":\"" + token + "\"}")) .andExpect(status().isOk());
        Cookie cookie = login("student@anurag.edu.in");
        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(jsonPath("$.role").value("student")).andExpect(jsonPath("$.profileComplete").value(false));
        mvc.perform(post("/api/auth/verify").with(csrf()).contentType("application/json").content("{\"token\":\"" + token + "\"}")) .andExpect(status().isBadRequest());
    }

    @Test
    void budgetsAndTeamRequestsAreStoredAndRestricted() throws Exception {
        UUID studentId = seed("teamstudent@anurag.edu.in", "student"); seed("teamadmin@anurag.edu.in", "admin");
        Cookie student = login("teamstudent@anurag.edu.in"), admin = login("teamadmin@anurag.edu.in");
        mvc.perform(post("/api/teams/CANSAT/requests").cookie(student).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/teams/requests").cookie(student)).andExpect(status().isForbidden());
        mvc.perform(post("/api/teams/CANSAT/requests/" + studentId + "/approve").cookie(admin).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/projects").cookie(student)).andExpect(jsonPath("$[?(@.name == 'CANSAT')].members").value(org.hamcrest.Matchers.hasItem(1)));
        String allocation = "{\"title\":\"Research allocation\",\"domain\":\"CANSAT\",\"kind\":\"allocation\",\"amount\":10000}";
        mvc.perform(post("/api/budget").cookie(student).with(csrf()).contentType("application/json").content(allocation)).andExpect(status().isForbidden());
        mvc.perform(post("/api/budget").cookie(admin).with(csrf()).contentType("application/json").content(allocation)).andExpect(status().isOk()).andExpect(jsonPath("$.remaining").value(10000));
        mvc.perform(post("/api/budget").cookie(admin).with(csrf()).contentType("application/json").content("{\"title\":\"Sensors\",\"domain\":\"CANSAT\",\"kind\":\"expense\",\"amount\":2500}")) .andExpect(status().isOk()).andExpect(jsonPath("$.remaining").value(7500));
        mvc.perform(get("/api/members").cookie(student)).andExpect(status().isOk());
    }

    @Test
    void developerGrantsAndRevokesPermissionsImmediatelyForExistingTokens() throws Exception {
        seed("owner@anurag.edu.in", "developer"); seed("researcher@anurag.edu.in", "student");
        Cookie owner = login("owner@anurag.edu.in"), researcher = login("researcher@anurag.edu.in");
        mvc.perform(get("/api/budget").cookie(researcher)).andExpect(status().isForbidden());
        mvc.perform(post("/api/access").cookie(researcher).with(csrf()).contentType("application/json").content("{\"email\":\"researcher@anurag.edu.in\",\"role\":\"admin\"}")) .andExpect(status().isForbidden());
        mvc.perform(post("/api/access").cookie(owner).with(csrf()).contentType("application/json").content("{\"email\":\"researcher@anurag.edu.in\",\"role\":\"admin\"}")) .andExpect(status().isOk());
        mvc.perform(get("/api/budget").cookie(researcher)).andExpect(status().isOk());
        mvc.perform(get("/api/access").cookie(researcher)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/access/researcher@anurag.edu.in").cookie(owner).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/budget").cookie(researcher)).andExpect(status().isForbidden());
        mvc.perform(post("/api/access").cookie(owner).with(csrf()).contentType("application/json").content("{\"email\":\"owner@anurag.edu.in\",\"role\":\"student\"}")) .andExpect(status().isForbidden());
    }

    @Test
    void onlyAdminsCanPublishAndNotificationReadsArePerAccount() throws Exception {
        seed("publisher@anurag.edu.in", "admin"); seed("reader@anurag.edu.in", "student");
        Cookie publisher = login("publisher@anurag.edu.in"), reader = login("reader@anurag.edu.in");
        String content = "{\"title\":\"Research news\",\"body\":\"A real update\",\"category\":\"News\",\"domain\":\"CANSAT\",\"location\":\"Lab\"}";
        mvc.perform(post("/api/updates").cookie(reader).with(csrf()).contentType("application/json").content(content)).andExpect(status().isForbidden());
        mvc.perform(post("/api/updates").cookie(publisher).with(csrf()).contentType("application/json").content(content)).andExpect(status().isOk());
        UUID id = database.jdbc.sql("SELECT id FROM updates WHERE title = 'Research news'").query(UUID.class).single();
        mvc.perform(get("/api/notifications").cookie(reader)).andExpect(jsonPath("$[0].read").value(false));
        mvc.perform(post("/api/notifications/read").cookie(reader).with(csrf()).contentType("application/json").content("{\"ids\":[\"" + id + "\"]}")) .andExpect(status().isOk());
        mvc.perform(get("/api/notifications").cookie(reader)).andExpect(jsonPath("$[0].read").value(true));
        mvc.perform(get("/api/notifications").cookie(publisher)).andExpect(jsonPath("$[0].read").value(false));
    }

    @Test
    void profilesPersistAndInvalidImagesAndDomainsAreRejected() throws Exception {
        UUID id = seed("profile@anurag.edu.in", "student"); Cookie cookie = login("profile@anurag.edu.in");
        mvc.perform(put("/api/profiles/me").cookie(cookie).with(csrf()).contentType("application/json").content("{\"firstName\":\"Test\",\"lastName\":\"Student\",\"phone\":\"9876543210\",\"department\":\"Computer Science\",\"roll\":\"TEST001\",\"bio\":\"Researcher\",\"interests\":[\"CANSAT\"],\"achievements\":\"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.firstName").value("Test"));
        mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(jsonPath("$.profileComplete").value(true));
        mvc.perform(multipart("/api/profiles/me/photo").file(new MockMultipartFile("file", "fake.png", "image/png", "<svg/>".getBytes())).cookie(cookie).with(csrf())).andExpect(status().isBadRequest());
        var image = new java.awt.image.BufferedImage(200, 300, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var output = new java.io.ByteArrayOutputStream(); javax.imageio.ImageIO.write(image, "png", output);
        mvc.perform(multipart("/api/profiles/me/photo").file(new MockMultipartFile("file", "photo.png", "image/png", output.toByteArray())).cookie(cookie).with(csrf())).andExpect(status().isOk());
        var photo = mvc.perform(get("/api/profiles/" + id + "/photo").cookie(cookie)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        var cropped = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(photo));
        assertThat(cropped.getWidth()).isEqualTo(400); assertThat(cropped.getHeight()).isEqualTo(400);
        mvc.perform(post("/api/teams/UNKNOWN/requests").cookie(cookie).with(csrf())).andExpect(status().isBadRequest());
    }

    @Test
    void studentsCannotEditOtherTasksAndLogoutInvalidatesCapturedCookies() throws Exception {
        UUID first = seed("first@anurag.edu.in", "student"); seed("second@anurag.edu.in", "student"); seed("taskadmin@anurag.edu.in", "admin");
        Cookie firstCookie = login("first@anurag.edu.in"), secondCookie = login("second@anurag.edu.in"), admin = login("taskadmin@anurag.edu.in");
        mvc.perform(post("/api/tasks").cookie(admin).with(csrf()).contentType("application/json").content("{\"title\":\"Build payload\",\"domain\":\"CANSAT\",\"assignedTo\":\"" + first + "\",\"due\":\"2026-12-01\"}")) .andExpect(status().isOk());
        UUID task = database.jdbc.sql("SELECT id FROM tasks WHERE assigned_to = :id").param("id", first).query(UUID.class).single();
        mvc.perform(put("/api/tasks/" + task).cookie(secondCookie).with(csrf()).contentType("application/json").content("{\"done\":true}")) .andExpect(status().isNotFound());
        mvc.perform(put("/api/tasks/" + task).cookie(firstCookie).with(csrf()).contentType("application/json").content("{\"done\":true}")) .andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").cookie(firstCookie).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").cookie(firstCookie)).andExpect(status().isUnauthorized());
    }

    @Test
    void learningProgressIsPersonalIdempotentAndValidatesSessions() throws Exception {
        seed("learner@anurag.edu.in", "student"); seed("otherlearner@anurag.edu.in", "student");
        Cookie learner = login("learner@anurag.edu.in"), other = login("otherlearner@anurag.edu.in");
        mvc.perform(get("/api/learning")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/learning/python-1").cookie(learner).contentType("application/json").content("{\"done\":true}")).andExpect(status().isForbidden());
        for (int attempt = 0; attempt < 2; attempt++) mvc.perform(put("/api/learning/python-1").cookie(learner).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isOk());
        mvc.perform(get("/api/learning").cookie(learner)).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0]").value("python-1"));
        mvc.perform(get("/api/learning").cookie(other)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(put("/api/learning/python-4").cookie(learner).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/learning/unknown-1").cookie(learner).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/learning/python-1-").cookie(learner).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/learning/python-1").cookie(learner).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/learning/python-1").cookie(learner).with(csrf()).contentType("application/json").content("{\"done\":false}")).andExpect(status().isOk());
        mvc.perform(get("/api/learning").cookie(learner)).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void cubeSatSupportsProfilesTeamsTasksUpdatesAndBudgets() throws Exception {
        UUID studentId = seed("cubestudent@anurag.edu.in", "student"); seed("cubeadmin@anurag.edu.in", "admin");
        Cookie student = login("cubestudent@anurag.edu.in"), admin = login("cubeadmin@anurag.edu.in");
        mvc.perform(get("/api/projects").cookie(student)).andExpect(jsonPath("$.length()").value(6)).andExpect(jsonPath("$[?(@.name == 'CUBESAT')].members").value(org.hamcrest.Matchers.hasItem(0)));
        mvc.perform(put("/api/profiles/me").cookie(student).with(csrf()).contentType("application/json").content("{\"firstName\":\"Cube\",\"lastName\":\"Student\",\"phone\":\"9876543210\",\"department\":\"Electronics\",\"roll\":\"CUBE001\",\"bio\":\"\",\"interests\":[\"CANSAT\",\"CUBESAT\",\"ROCKET\",\"DRONES\",\"ROBOTICS\",\"ROVERS\"],\"achievements\":\"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.interests.length()").value(6));
        mvc.perform(post("/api/teams/CUBESAT/requests").cookie(student).with(csrf())).andExpect(status().isOk());
        mvc.perform(post("/api/teams/CUBESAT/requests/" + studentId + "/approve").cookie(student).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(post("/api/teams/CUBESAT/requests/" + studentId + "/approve").cookie(admin).with(csrf())).andExpect(status().isOk());
        String taskBody = "{\"title\":\"CubeSat power budget\",\"domain\":\"CUBESAT\",\"assignedTo\":\"" + studentId + "\",\"due\":\"2026-12-01\"}";
        mvc.perform(post("/api/tasks").cookie(student).with(csrf()).contentType("application/json").content(taskBody)).andExpect(status().isForbidden());
        mvc.perform(post("/api/tasks").cookie(admin).with(csrf()).contentType("application/json").content(taskBody)).andExpect(status().isOk());
        UUID taskId = database.jdbc.sql("SELECT id FROM tasks WHERE assigned_to = :id").param("id", studentId).query(UUID.class).single();
        mvc.perform(put("/api/tasks/" + taskId).cookie(student).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isOk());
        mvc.perform(get("/api/projects").cookie(student)).andExpect(jsonPath("$[?(@.name == 'CUBESAT')].progress").value(org.hamcrest.Matchers.hasItem(100))).andExpect(jsonPath("$[?(@.name == 'CUBESAT')].members").value(org.hamcrest.Matchers.hasItem(1)));
        mvc.perform(post("/api/updates").cookie(admin).with(csrf()).contentType("application/json").content("{\"title\":\"CubeSat review\",\"body\":\"Review the spacecraft requirements.\",\"category\":\"Announcement\",\"domain\":\"CUBESAT\",\"location\":\"Research lab\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.domain").value("CUBESAT"));
        mvc.perform(get("/api/notifications").cookie(student)).andExpect(jsonPath("$[0].update.domain").value("CUBESAT"));
        mvc.perform(post("/api/budget").cookie(admin).with(csrf()).contentType("application/json").content("{\"title\":\"CubeSat components\",\"domain\":\"CUBESAT\",\"kind\":\"allocation\",\"amount\":5000}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.entries[0].team").value("CubeSat research team"));
    }

    @Test
    void cubeSatAndDigitalTwinLearningSessionsPersistIndependently() throws Exception {
        seed("spacelearner@anurag.edu.in", "student"); Cookie student = login("spacelearner@anurag.edu.in");
        for (String path : java.util.List.of("cubesat", "digitaltwin")) {
            for (int session = 1; session <= 3; session++) mvc.perform(put("/api/learning/" + path + "-" + session).cookie(student).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isOk());
        }
        mvc.perform(get("/api/learning").cookie(student)).andExpect(jsonPath("$.length()").value(6)).andExpect(jsonPath("$[0]").value("cubesat-1")).andExpect(jsonPath("$[5]").value("digitaltwin-3"));
        mvc.perform(put("/api/learning/digitaltwin-4").cookie(student).with(csrf()).contentType("application/json").content("{\"done\":true}")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/learning/cubesat-2").cookie(student).with(csrf()).contentType("application/json").content("{\"done\":false}")).andExpect(status().isOk());
        mvc.perform(get("/api/learning").cookie(student)).andExpect(jsonPath("$.length()").value(5));
    }
}
