package org.anurag.research;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    record Credentials(@NotBlank @Email @Size(max = 150) String email, @NotBlank @Size(min = 12, max = 128) String password) {}
    record Verification(@NotBlank @Pattern(regexp = "[a-f0-9]{64}") String token) {}
    private record Bucket(Instant start, int count) {}
    final Database database;
    final ProfilesController profiles;
    private final PasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final JavaMailSender mail;
    private final boolean secure;
    private final String developerEmail;
    private final String frontendUrl;
    private final String mailFrom;
    private final ConcurrentHashMap<String, Bucket> attempts = new ConcurrentHashMap<>();
    private final String dummyPassword;

    public AuthController(Database database, ProfilesController profiles, PasswordEncoder passwords, JwtEncoder encoder, JavaMailSender mail,
            @Value("${app.cookie-secure}") boolean secure, @Value("${app.developer-email}") String developerEmail,
            @Value("${app.frontend-url}") String frontendUrl, @Value("${app.mail-from}") String mailFrom) {
        this.database = database; this.profiles = profiles; this.passwords = passwords; this.encoder = encoder; this.mail = mail;
        this.secure = secure; this.developerEmail = developerEmail.toLowerCase(Locale.ROOT); this.frontendUrl = frontendUrl; this.mailFrom = mailFrom;
        this.dummyPassword = passwords.encode(UUID.randomUUID().toString());
    }

    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken()); }

    static String universityEmail(String value) {
        String email = value.strip().toLowerCase(Locale.ROOT);
        if (!email.matches("[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@anurag\\.edu\\.in") || email.length() > 150) throw new ResponseStatusException(BAD_REQUEST, "Use your @anurag.edu.in university email.");
        return email;
    }

    private void validatePassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ResponseStatusException(BAD_REQUEST, "Use a password of 12–72 UTF-8 bytes.");
    }

    void limit(HttpServletRequest request) {
        Instant now = Instant.now();
        if (attempts.size() > 10000) attempts.entrySet().removeIf(entry -> entry.getValue().start().plusSeconds(300).isBefore(now));
        if (attempts.size() > 10000 && !attempts.containsKey(request.getRemoteAddr())) throw new ResponseStatusException(TOO_MANY_REQUESTS, "Please try again later.");
        Bucket bucket = attempts.compute(request.getRemoteAddr(), (key, previous) -> previous == null || previous.start().plusSeconds(300).isBefore(now) ? new Bucket(now, 1) : new Bucket(previous.start(), previous.count() + 1));
        if (bucket.count() > 30) throw new ResponseStatusException(TOO_MANY_REQUESTS, "Too many sign-in attempts. Try again in five minutes.");
    }

    static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }

    String initialRole(String email) {
        return email.equals(developerEmail) ? "developer" : database.jdbc.sql("SELECT role FROM access_grants WHERE email = :email")
            .param("email", email).query(String.class).optional().orElse("student");
    }

    @PostMapping("/register")
    @Transactional
    Map<String, String> register(@Valid @RequestBody Credentials credentials, HttpServletRequest request) {
        limit(request);
        String email = universityEmail(credentials.email());
        validatePassword(credentials.password());
        UUID id = UUID.randomUUID();
        String role = initialRole(email);
        database.jdbc.sql("INSERT INTO accounts (id, email, password_hash, role) VALUES (:id, :email, :password, :role)")
            .param("id", id).param("email", email).param("password", passwords.encode(credentials.password())).param("role", role).update();
        sendVerification(id, email);
        return Map.of("message", "Check your university email for the verification link.");
    }

    private void sendVerification(UUID id, String email) {
        database.jdbc.sql("DELETE FROM email_verifications WHERE account_id = :id").param("id", id).update();
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        database.jdbc.sql("INSERT INTO email_verifications (token_hash, account_id, expires_at) VALUES (:hash, :id, :expiry)")
            .param("hash", hash(token)).param("id", id).param("expiry", java.sql.Timestamp.from(Instant.now().plus(Duration.ofHours(24)))).update();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom); message.setTo(email); message.setSubject("Verify your Anurag Space Research Center account");
        message.setText("Verify your university email within 24 hours:\n" + frontendUrl.replaceAll("/$", "") + "/?verify=" + token + "\n\nIf you did not request this account, ignore this email.");
        mail.send(message);
    }

    @PostMapping("/resend")
    @Transactional
    Map<String, String> resend(@Valid @RequestBody Credentials credentials, HttpServletRequest request) {
        limit(request);
        validatePassword(credentials.password());
        String email = universityEmail(credentials.email());
        var account = database.jdbc.sql("SELECT * FROM accounts WHERE email = :email").param("email", email).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional();
        boolean matches = passwords.matches(credentials.password(), account.map(value -> value.get("password_hash").toString()).orElse(dummyPassword));
        if (account.isPresent() && matches && !Boolean.TRUE.equals(account.get().get("verified"))) sendVerification(Database.uuid(account.get().get("id")), email);
        return Map.of("message", "If the account details are correct and verification is pending, a fresh link has been sent.");
    }

    @PostMapping("/verify")
    @Transactional
    Map<String, String> verify(@Valid @RequestBody Verification verification, HttpServletRequest request) {
        limit(request);
        var record = database.jdbc.sql("SELECT account_id, expires_at FROM email_verifications WHERE token_hash = :hash FOR UPDATE").param("hash", hash(verification.token())).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional()
            .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid or expired verification link."));
        if (Database.instant(record.get("expires_at")).isBefore(Instant.now())) throw new ResponseStatusException(BAD_REQUEST, "Invalid or expired verification link.");
        database.jdbc.sql("UPDATE accounts SET verified = TRUE WHERE id = :id").param("id", record.get("account_id")).update();
        database.jdbc.sql("DELETE FROM email_verifications WHERE account_id = :id").param("id", record.get("account_id")).update();
        return Map.of("message", "Email verified. You can now sign in.");
    }

    @PostMapping("/login")
    Map<String, Object> login(@Valid @RequestBody Credentials credentials, HttpServletRequest request, HttpServletResponse response) {
        limit(request);
        validatePassword(credentials.password());
        String email = universityEmail(credentials.email());
        var account = database.jdbc.sql("SELECT * FROM accounts WHERE email = :email").param("email", email).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional();
        boolean passwordValid = passwords.matches(credentials.password(), account.map(value -> value.get("password_hash").toString()).orElse(dummyPassword));
        if (account.isEmpty() || !passwordValid) throw new ResponseStatusException(UNAUTHORIZED, "Email or password is incorrect.");
        if (!Boolean.TRUE.equals(account.get().get("verified"))) throw new ResponseStatusException(FORBIDDEN, "Verify your university email before signing in.");
        UUID id = Database.uuid(account.get().get("id"));
        return signIn(id, response);
    }

    Map<String, Object> signIn(UUID id, HttpServletResponse response) {
        var account = database.account(id);
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("anurag-research").subject(id.toString()).issuedAt(now).expiresAt(now.plus(Duration.ofHours(8)))
            .claim("version", account.get("session_version")).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("anurag_session", token).httpOnly(true).secure(secure).sameSite("Lax").path("/api").maxAge(Duration.ofHours(8)).build().toString());
        return session(id);
    }

    Map<String, Object> session(UUID id) {
        var account = database.account(id);
        return Map.of("id", id, "email", account.get("email"), "role", account.get("role"), "profileComplete", account.get("profile_complete"), "profile", profiles.profile(id));
    }

    @GetMapping("/me")
    Map<String, Object> me(Authentication authentication) { return session(UUID.fromString(authentication.getName())); }

    @PostMapping("/logout")
    Map<String, String> logout(Authentication authentication, HttpServletResponse response) {
        database.jdbc.sql("UPDATE accounts SET session_version = session_version + 1 WHERE id = :id").param("id", UUID.fromString(authentication.getName())).update();
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("anurag_session", "").httpOnly(true).secure(secure).sameSite("Lax").path("/api").maxAge(0).build().toString());
        return Map.of("message", "Signed out.");
    }
}
