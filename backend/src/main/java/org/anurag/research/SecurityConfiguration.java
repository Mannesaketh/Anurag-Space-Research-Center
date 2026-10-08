package org.anurag.research;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    SecretKeySpec signingKey(@Value("${app.jwt-secret}") String secret) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) throw new IllegalStateException("JWT_SECRET must contain at least 32 bytes.");
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKeySpec key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }

    @Bean
    JwtDecoder jwtDecoder(SecretKeySpec key) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("anurag-research"));
        return decoder;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, JwtDecoder decoder, Database database,
            @Value("${app.cookie-secure}") boolean secure, @Value("${app.allowed-origins}") String origins) throws Exception {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(origin -> !origin.isBlank()).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
        cors.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        CookieCsrfTokenRepository csrf = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrf.setCookieCustomizer(cookie -> cookie.secure(secure).sameSite("Lax").path("/"));
        return http.cors(config -> config.configurationSource(source))
            .csrf(config -> config.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(config -> config
                .requestMatchers(HttpMethod.GET, "/", "/privacy", "/terms", "/index.html", "/assets/**", "/robots.txt", "/projects", "/tasks", "/team", "/updates", "/assistant", "/resources", "/profile", "/admin", "/access").permitAll()
                .requestMatchers("/api/auth/csrf", "/api/auth/register", "/api/auth/verify", "/api/auth/resend", "/api/auth/login", "/api/auth/providers", "/api/auth/google", "/api/auth/google/challenge", "/api/auth/firebase", "/actuator/health").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(config -> config
                .authenticationEntryPoint((request, response, error) -> jsonError(response, 401, "Please sign in."))
                .accessDeniedHandler((request, response, error) -> jsonError(response, 403, "This action is not permitted.")))
            .addFilterBefore(new OncePerRequestFilter() {
                @Override
                protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
                    String token = request.getCookies() == null ? null : Arrays.stream(request.getCookies())
                        .filter(cookie -> cookie.getName().equals("anurag_session")).map(jakarta.servlet.http.Cookie::getValue).findFirst().orElse(null);
                    if (token != null) {
                        try {
                            Jwt jwt = decoder.decode(token);
                            UUID id = UUID.fromString(jwt.getSubject());
                            var account = database.account(id);
                            if (Boolean.TRUE.equals(account.get("verified")) && jwt.getClaim("version") instanceof Number version && ((Number) account.get("session_version")).intValue() == version.intValue()) {
                                var authority = new SimpleGrantedAuthority("ROLE_" + account.get("role").toString().toUpperCase(java.util.Locale.ROOT));
                                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id.toString(), null, List.of(authority)));
                            }
                        } catch (JwtException | IllegalArgumentException | org.springframework.web.server.ResponseStatusException exception) {
                            SecurityContextHolder.clearContext();
                        }
                    }
                    chain.doFilter(request, response);
                }
            }, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    static void jsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
