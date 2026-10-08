package org.anurag.research;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/learning")
public class LearningController {
    private static final Set<String> PATHS = Set.of("python", "electronics", "rocket", "robotics", "drones", "research", "cubesat", "digitaltwin");
    record Completion(@NotNull Boolean done) {}
    private final Database database;

    public LearningController(Database database) { this.database = database; }

    @GetMapping
    List<String> progress(Authentication authentication) {
        return database.jdbc.sql("SELECT lesson_id FROM learning_progress WHERE account_id = :id ORDER BY lesson_id")
            .param("id", UUID.fromString(authentication.getName())).query(String.class).list();
    }

    @PutMapping("/{lesson}")
    void complete(@PathVariable String lesson, @Valid @RequestBody Completion input, Authentication authentication) {
        String[] parts = lesson.split("-", -1);
        if (parts.length != 2 || !PATHS.contains(parts[0]) || !Set.of("1", "2", "3").contains(parts[1])) throw new ResponseStatusException(BAD_REQUEST, "Unknown learning session.");
        UUID account = UUID.fromString(authentication.getName());
        if (input.done()) database.jdbc.sql("INSERT IGNORE INTO learning_progress (account_id, lesson_id) VALUES (:id, :lesson)")
            .param("id", account).param("lesson", lesson).update();
        else database.jdbc.sql("DELETE FROM learning_progress WHERE account_id = :id AND lesson_id = :lesson")
            .param("id", account).param("lesson", lesson).update();
    }
}
