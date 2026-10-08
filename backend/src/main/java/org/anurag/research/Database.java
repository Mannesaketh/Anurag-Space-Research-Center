package org.anurag.research;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Component
public class Database {
    final JdbcClient jdbc;

    public Database(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Map<String, Object> account(UUID id) {
        return jdbc.sql("SELECT * FROM accounts WHERE id = :id").param("id", id).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional()
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Account not found."));
    }

    UUID accountId(String email) {
        return jdbc.sql("SELECT id FROM accounts WHERE email = :email").param("email", email)
            .query(String.class).optional().map(UUID::fromString).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Account not found."));
    }

    /** IDs are stored as CHAR(36) in MySQL; accept either a String or a UUID value. */
    static UUID uuid(Object value) {
        return value instanceof UUID id ? id : UUID.fromString(value.toString());
    }

    static Instant instant(Object value) {
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toInstant();
        if (value instanceof java.time.OffsetDateTime timestamp) return timestamp.toInstant();
        if (value instanceof java.time.LocalDateTime timestamp) return timestamp.toInstant(java.time.ZoneOffset.UTC);
        return Instant.parse(value.toString());
    }
}
