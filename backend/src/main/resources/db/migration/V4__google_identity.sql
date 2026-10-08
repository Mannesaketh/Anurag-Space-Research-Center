ALTER TABLE accounts ADD COLUMN google_subject VARCHAR(255) NULL;
ALTER TABLE accounts ADD CONSTRAINT accounts_google_subject UNIQUE (google_subject);

CREATE TABLE google_login_challenges (
    token_hash VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE INDEX google_challenge_expiry ON google_login_challenges (expires_at);
