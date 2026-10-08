package org.anurag.research;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.*;
import javax.imageio.ImageIO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/profiles")
public class ProfilesController {
    record ProfileInput(@NotBlank @Size(max = 60) String firstName, @NotBlank @Size(max = 60) String lastName,
        @NotBlank @Size(max = 18) String phone, @NotBlank @Size(max = 100) String department,
        @NotBlank @Size(max = 60) String roll, @NotNull @Size(max = 500) String bio,
        @NotEmpty @Size(max = 6) List<String> interests, @NotNull @Size(max = 1500) String achievements) {}
    static final Set<String> DOMAINS = Set.of("CANSAT", "CUBESAT", "ROCKET", "DRONES", "ROBOTICS", "ROVERS");
    final Database database;
    final ObjectMapper json;

    public ProfilesController(Database database, ObjectMapper json) { this.database = database; this.json = json; }

    Map<String, Object> profile(UUID id) {
        var account = database.account(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("firstName", account.get("first_name")); result.put("lastName", account.get("last_name"));
        result.put("phone", account.get("phone")); result.put("department", account.get("department"));
        result.put("roll", account.get("roll")); result.put("bio", account.get("bio"));
        result.put("achievements", account.get("achievements"));
        result.put("photo", account.get("photo") == null ? "" : "/profiles/" + id + "/photo");
        try { result.put("interests", json.readValue(account.get("interests").toString(), new TypeReference<List<String>>() {})); }
        catch (java.io.IOException error) { throw new IllegalStateException("Invalid stored profile.", error); }
        return result;
    }

    @GetMapping("/me")
    Map<String, Object> me(Authentication authentication) { return profile(UUID.fromString(authentication.getName())); }

    @PutMapping("/me")
    Map<String, Object> save(@Valid @RequestBody ProfileInput input, Authentication authentication) throws java.io.IOException {
        String digits = input.phone().replaceAll("\\D", "");
        if (!input.phone().matches("[+0-9 ()-]+") || digits.length() < 10 || digits.length() > 15) throw new ResponseStatusException(BAD_REQUEST, "Contact number must contain 10–15 digits.");
        if (!DOMAINS.containsAll(input.interests()) || new HashSet<>(input.interests()).size() != input.interests().size()) throw new ResponseStatusException(BAD_REQUEST, "Choose valid, distinct research interests.");
        UUID id = UUID.fromString(authentication.getName());
        database.jdbc.sql("UPDATE accounts SET first_name = :first, last_name = :last, phone = :phone, department = :department, roll = :roll, bio = :bio, interests = :interests, achievements = :achievements, profile_complete = TRUE WHERE id = :id")
            .param("first", input.firstName().strip()).param("last", input.lastName().strip()).param("phone", input.phone().strip())
            .param("department", input.department().strip()).param("roll", input.roll().strip().toUpperCase(Locale.ROOT)).param("bio", input.bio().strip())
            .param("interests", json.writeValueAsString(input.interests())).param("achievements", input.achievements().strip()).param("id", id).update();
        return profile(id);
    }

    @PostMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String, Object> photo(@RequestParam("file") MultipartFile file, Authentication authentication) throws java.io.IOException {
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024) throw new ResponseStatusException(BAD_REQUEST, "Choose an image no larger than 2 MB.");
        String type = file.getContentType();
        String filename = file.getOriginalFilename();
        if (!Set.of("image/jpeg", "image/png").contains(type == null ? "" : type) || filename == null || !filename.toLowerCase(Locale.ROOT).matches(".*\\.(jpe?g|png)$")) throw new ResponseStatusException(BAD_REQUEST, "JPG and PNG files only.");
        byte[] bytes = file.getBytes();
        boolean png = bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10});
        boolean jpeg = bytes.length >= 3 && bytes[0] == (byte) 255 && bytes[1] == (byte) 216 && bytes[2] == (byte) 255;
        if ((type.equals("image/png") && !png) || (type.equals("image/jpeg") && !jpeg)) throw new ResponseStatusException(BAD_REQUEST, "Invalid image content.");
        BufferedImage image;
        try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw new ResponseStatusException(BAD_REQUEST, "Invalid image.");
            var reader = readers.next();
            try {
                reader.setInput(stream);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (Math.min(width, height) < 128 || Math.max(width, height) > 4096) throw new ResponseStatusException(BAD_REQUEST, "Use an image between 128 and 4096 pixels per side.");
                image = reader.read(0);
            } catch (javax.imageio.IIOException error) { throw new ResponseStatusException(BAD_REQUEST, "The image could not be decoded."); }
            finally { reader.dispose(); }
        }
        BufferedImage cropped = new BufferedImage(400, 400, type.equals("image/png") ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = cropped.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            int side = Math.min(image.getWidth(), image.getHeight());
            int offsetX = (image.getWidth() - side) / 2, offsetY = (image.getHeight() - side) / 2;
            graphics.drawImage(image, 0, 0, 400, 400, offsetX, offsetY, offsetX + side, offsetY + side, null);
        } finally { graphics.dispose(); }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(cropped, type.equals("image/png") ? "png" : "jpeg", output);
        UUID id = UUID.fromString(authentication.getName());
        database.jdbc.sql("UPDATE accounts SET photo = :photo, photo_type = :type WHERE id = :id").param("photo", output.toByteArray()).param("type", type).param("id", id).update();
        return profile(id);
    }

    @DeleteMapping("/me/photo")
    Map<String, Object> removePhoto(Authentication authentication) {
        UUID id = UUID.fromString(authentication.getName());
        database.jdbc.sql("UPDATE accounts SET photo = NULL, photo_type = NULL WHERE id = :id").param("id", id).update();
        return profile(id);
    }

    @GetMapping("/{id}/photo")
    ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var account = database.account(id);
        if (account.get("photo") == null) throw new ResponseStatusException(NOT_FOUND, "Photo not found.");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(account.get("photo_type").toString()))
            .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff").body((byte[]) account.get("photo"));
    }
}
