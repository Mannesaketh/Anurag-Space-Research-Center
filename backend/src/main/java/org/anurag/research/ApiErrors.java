package org.anurag.research;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message", error.getReason() == null ? "Request failed." : error.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException error) {
        return ResponseEntity.badRequest().body(Map.of("message", error.getBindingResult().getFieldErrors().stream().findFirst().map(field -> field.getField() + " " + field.getDefaultMessage()).orElse("Invalid request.")));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict() { return ResponseEntity.status(409).body(Map.of("message", "This record already exists or references an unavailable record.")); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> upload() { return ResponseEntity.status(413).body(Map.of("message", "Images must be 2 MB or smaller.")); }
    @ExceptionHandler(MailException.class)
    ResponseEntity<?> mail() { return ResponseEntity.status(503).body(Map.of("message", "Verification email could not be sent. Please try again later.")); }
}
