package org.anurag.research;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api")
public class WorkspaceController {
    record UpdateInput(@NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 2000) String body,
        @NotBlank String category, @NotBlank String domain, Instant date, @NotNull @Size(max = 150) String location) {}
    record ReadInput(@NotNull @Size(max = 200) List<UUID> ids) {}
    record AccessInput(@NotBlank @Email @Size(max = 150) String email, @Pattern(regexp = "admin|student") @NotNull String role) {}
    record DoneInput(boolean done) {}
    record TaskInput(@NotBlank @Size(max = 150) String title, @NotBlank String domain, @NotNull UUID assignedTo, @NotNull LocalDate due) {}
    record BudgetInput(@NotBlank @Size(max = 150) String title, @NotBlank String domain, @NotNull @Pattern(regexp = "allocation|expense") String kind,
        @NotNull @DecimalMin("0.01") @DecimalMax("9999999999.99") @Digits(integer = 10, fraction = 2) BigDecimal amount) {}
    final Database database;

    public WorkspaceController(Database database) { this.database = database; }
    static UUID user(Authentication authentication) { return UUID.fromString(authentication.getName()); }
    static void domain(String name) { if (!ProfilesController.DOMAINS.contains(name)) throw new ResponseStatusException(BAD_REQUEST, "Unknown research domain."); }

    Map<String, Object> updateDto(Map<String, Object> row) {
        return Map.of("id", row.get("id"), "title", row.get("title"), "body", row.get("body"), "category", row.get("category"), "domain", row.get("domain"),
            "date", row.get("event_at") == null ? "" : Database.instant(row.get("event_at")).toString(), "location", row.get("location"), "createdAt", Database.instant(row.get("created_at")).toString(),
            "author", (row.get("first_name") + " " + row.get("last_name")).strip().isEmpty() ? "Anurag Space Research Center team" : (row.get("first_name") + " " + row.get("last_name")).strip());
    }
    List<Map<String, Object>> updateRows() {
        return database.jdbc.sql("SELECT updates.*, accounts.first_name, accounts.last_name FROM updates JOIN accounts ON accounts.id = updates.author_id ORDER BY updates.created_at DESC LIMIT 200").query().listOfRows();
    }

    @GetMapping("/updates")
    List<Map<String, Object>> updates() { return updateRows().stream().map(this::updateDto).toList(); }

    @PostMapping("/updates")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    Map<String, Object> publish(@Valid @RequestBody UpdateInput input, Authentication authentication) {
        if (!Set.of("Announcement", "Hackathon", "Event", "Organisation", "News").contains(input.category())) throw new ResponseStatusException(BAD_REQUEST, "Unknown update category.");
        if (!input.domain().equals("All domains")) domain(input.domain());
        if ((Set.of("Hackathon", "Event").contains(input.category()) && input.date() == null) || (input.date() != null && !input.date().isAfter(Instant.now()))) throw new ResponseStatusException(BAD_REQUEST, "Events require a future date and time.");
        UUID id = UUID.randomUUID();
        database.jdbc.sql("INSERT INTO updates (id, title, body, category, domain, event_at, location, author_id) VALUES (:id, :title, :body, :category, :domain, :date, :location, :author)")
            .param("id", id).param("title", input.title().strip()).param("body", input.body().strip()).param("category", input.category()).param("domain", input.domain())
            .param("date", input.date() == null ? null : java.sql.Timestamp.from(input.date()), java.sql.Types.TIMESTAMP).param("location", input.location().strip()).param("author", user(authentication)).update();
        return updateDto(database.jdbc.sql("SELECT updates.*, accounts.first_name, accounts.last_name FROM updates JOIN accounts ON accounts.id = updates.author_id WHERE updates.id = :id").param("id", id).query().singleRow());
    }

    @DeleteMapping("/updates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    void remove(@PathVariable UUID id) {
        if (database.jdbc.sql("DELETE FROM updates WHERE id = :id").param("id", id).update() == 0) throw new ResponseStatusException(NOT_FOUND, "Update not found.");
    }

    @GetMapping("/notifications")
    List<Map<String, Object>> notifications(Authentication authentication) {
        Set<String> read = new HashSet<>(database.jdbc.sql("SELECT update_id FROM notification_reads WHERE account_id = :id").param("id", user(authentication)).query(String.class).list());
        return updateRows().stream().map(row -> Map.<String, Object>of("update", updateDto(row), "read", read.contains(String.valueOf(row.get("id"))))).toList();
    }

    @PostMapping("/notifications/read")
    @Transactional
    void read(@Valid @RequestBody ReadInput input, Authentication authentication) {
        for (UUID id : input.ids()) database.jdbc.sql("INSERT IGNORE INTO notification_reads (account_id, update_id) SELECT :account, id FROM updates WHERE id = :id")
            .param("account", user(authentication)).param("id", id).update();
    }

    @GetMapping("/access")
    @PreAuthorize("hasRole('DEVELOPER')")
    List<Map<String, Object>> access() {
        return database.jdbc.sql("SELECT grants.email, grants.role, accounts.verified FROM access_grants grants LEFT JOIN accounts ON accounts.email = grants.email ORDER BY grants.created_at DESC")
            .query().listOfRows().stream().map(row -> Map.<String, Object>of("id", row.get("email"), "email", row.get("email"), "role", row.get("role"), "status", Boolean.TRUE.equals(row.get("verified")) ? "Active" : "Invited")).toList();
    }

    @PostMapping("/access")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Transactional
    List<Map<String, Object>> grant(@Valid @RequestBody AccessInput input, Authentication authentication) {
        String email = AuthController.universityEmail(input.email());
        protectDeveloper(email);
        database.jdbc.sql("INSERT INTO access_grants (email, role, granted_by) VALUES (:email, :role, :owner) ON DUPLICATE KEY UPDATE role = VALUES(role), granted_by = VALUES(granted_by)")
            .param("email", email).param("role", input.role()).param("owner", user(authentication)).update();
        database.jdbc.sql("UPDATE accounts SET role = :role WHERE email = :email AND role <> 'developer'").param("role", input.role()).param("email", email).update();
        return access();
    }

    void protectDeveloper(String email) {
        if (database.jdbc.sql("SELECT role FROM accounts WHERE email = :email").param("email", email).query(String.class).optional().orElse("").equals("developer")) throw new ResponseStatusException(FORBIDDEN, "Developer access cannot be changed here.");
    }

    @DeleteMapping("/access/{email}")
    @PreAuthorize("hasRole('DEVELOPER')")
    @Transactional
    void revoke(@PathVariable String email) {
        email = AuthController.universityEmail(email);
        protectDeveloper(email);
        database.jdbc.sql("DELETE FROM access_grants WHERE email = :email").param("email", email).update();
        database.jdbc.sql("UPDATE accounts SET role = 'student' WHERE email = :email AND role <> 'developer'").param("email", email).update();
    }

    @GetMapping("/projects")
    List<Map<String, Object>> projects(Authentication authentication) {
        return database.jdbc.sql("SELECT teams.domain AS name, teams.name AS team, COALESCE(completed.progress, teams.progress) AS progress, (SELECT COUNT(*) FROM team_memberships members WHERE members.domain = teams.domain AND members.status = 'approved') AS members, EXISTS (SELECT 1 FROM team_memberships mine WHERE mine.domain = teams.domain AND mine.account_id = :id) AS requested FROM teams LEFT JOIN (SELECT domain, 100 * SUM(CASE WHEN done THEN 1 ELSE 0 END) DIV COUNT(*) AS progress FROM tasks GROUP BY domain) completed ON completed.domain = teams.domain ORDER BY teams.domain")
            .param("id", user(authentication)).query().listOfRows().stream().map(row -> {
                Map<String, Object> project = new java.util.LinkedHashMap<>(row);
                project.put("requested", row.get("requested") instanceof Number number ? number.intValue() != 0 : Boolean.TRUE.equals(row.get("requested")));
                return project;
            }).toList();
    }

    @PostMapping("/teams/{domain}/requests")
    void join(@PathVariable String domain, Authentication authentication) {
        domain(domain);
        database.jdbc.sql("INSERT IGNORE INTO team_memberships (account_id, domain) VALUES (:id, :domain)").param("id", user(authentication)).param("domain", domain).update();
    }

    @GetMapping("/teams/requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    List<Map<String, Object>> requests() {
        return database.jdbc.sql("SELECT members.account_id AS id, members.domain, accounts.first_name AS `firstName`, accounts.last_name AS `lastName`, accounts.email FROM team_memberships members JOIN accounts ON accounts.id = members.account_id WHERE members.status = 'pending' ORDER BY members.created_at").query().listOfRows();
    }

    @PostMapping("/teams/{domain}/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    void approve(@PathVariable String domain, @PathVariable UUID id) {
        domain(domain);
        if (database.jdbc.sql("UPDATE team_memberships SET status = 'approved' WHERE domain = :domain AND account_id = :id").param("domain", domain).param("id", id).update() == 0) throw new ResponseStatusException(NOT_FOUND, "Request not found.");
    }

    @GetMapping("/members")
    List<Map<String, Object>> members() {
        return database.jdbc.sql("SELECT id, first_name, last_name, department, role, COALESCE((SELECT GROUP_CONCAT(teams.name ORDER BY teams.name SEPARATOR ', ') FROM team_memberships membership JOIN teams ON teams.domain = membership.domain WHERE membership.account_id = accounts.id AND membership.status = 'approved'), 'Independent researcher') AS team FROM accounts WHERE verified = TRUE AND profile_complete = TRUE ORDER BY first_name")
            .query().listOfRows().stream().map(row -> Map.<String, Object>of("id", row.get("id"), "name", row.get("first_name") + " " + row.get("last_name"), "initials", row.get("first_name").toString().substring(0, 1) + row.get("last_name").toString().substring(0, 1), "department", row.get("department"), "team", row.get("team"), "role", row.get("role").equals("student") ? "Researcher" : "Team lead", "color", "bg-[#e5eee6]")).toList();
    }

    @GetMapping("/tasks")
    List<Map<String, Object>> tasks(Authentication authentication) {
        return database.jdbc.sql("SELECT id, title, domain, due, done FROM tasks WHERE assigned_to = :id ORDER BY due").param("id", user(authentication)).query().listOfRows();
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    void assign(@Valid @RequestBody TaskInput input, Authentication authentication) {
        domain(input.domain());
        if (!Boolean.TRUE.equals(database.account(input.assignedTo()).get("verified"))) throw new ResponseStatusException(BAD_REQUEST, "Assign tasks to verified accounts only.");
        database.jdbc.sql("INSERT INTO tasks (id, title, domain, assigned_to, due, created_by) VALUES (:id, :title, :domain, :assignee, :due, :owner)")
            .param("id", UUID.randomUUID()).param("title", input.title().strip()).param("domain", input.domain()).param("assignee", input.assignedTo()).param("due", input.due()).param("owner", user(authentication)).update();
    }

    @PutMapping("/tasks/{id}")
    void toggle(@PathVariable UUID id, @RequestBody DoneInput input, Authentication authentication) {
        if (database.jdbc.sql("UPDATE tasks SET done = :done WHERE id = :id AND assigned_to = :user").param("done", input.done()).param("id", id).param("user", user(authentication)).update() == 0) throw new ResponseStatusException(NOT_FOUND, "Task not found.");
    }

    @GetMapping("/budget")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    Map<String, Object> budget() {
        var sums = database.jdbc.sql("SELECT COALESCE(SUM(CASE WHEN kind = 'allocation' THEN amount ELSE 0 END), 0) AS allocated, COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS spent FROM budget_entries").query().singleRow();
        BigDecimal allocated = (BigDecimal) sums.get("allocated"), spent = (BigDecimal) sums.get("spent");
        var entries = database.jdbc.sql("SELECT entries.id, entries.title, teams.name AS team, entries.kind, entries.amount, entries.created_at AS date FROM budget_entries entries JOIN teams ON teams.domain = entries.domain ORDER BY entries.created_at DESC LIMIT 200").query().listOfRows();
        return Map.of("allocated", allocated, "spent", spent, "remaining", allocated.subtract(spent), "entries", entries);
    }

    @PostMapping("/budget")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    Map<String, Object> budgetEntry(@Valid @RequestBody BudgetInput input, Authentication authentication) {
        domain(input.domain());
        database.jdbc.sql("INSERT INTO budget_entries (id, title, domain, kind, amount, created_by) VALUES (:id, :title, :domain, :kind, :amount, :owner)")
            .param("id", UUID.randomUUID()).param("title", input.title().strip()).param("domain", input.domain()).param("kind", input.kind()).param("amount", input.amount()).param("owner", user(authentication)).update();
        return budget();
    }
}
