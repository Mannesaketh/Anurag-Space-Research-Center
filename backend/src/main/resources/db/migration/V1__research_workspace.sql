CREATE TABLE accounts (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  role VARCHAR(15) NOT NULL DEFAULT 'student',
  session_version INTEGER NOT NULL DEFAULT 0,
  first_name VARCHAR(60) NOT NULL DEFAULT '',
  last_name VARCHAR(60) NOT NULL DEFAULT '',
  phone VARCHAR(18) NOT NULL DEFAULT '',
  department VARCHAR(100) NOT NULL DEFAULT '',
  roll VARCHAR(60) NOT NULL DEFAULT '',
  -- MySQL has no partial indexes: unique on a generated column that is NULL for empty roll numbers
  roll_unique VARCHAR(60) GENERATED ALWAYS AS (NULLIF(roll, '')) STORED,
  bio VARCHAR(500) NOT NULL DEFAULT '',
  interests VARCHAR(500) NOT NULL DEFAULT '[]',
  achievements VARCHAR(1500) NOT NULL DEFAULT '',
  photo MEDIUMBLOB,
  photo_type VARCHAR(20),
  profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT accounts_role_check CHECK (role IN ('student', 'admin', 'developer')),
  CONSTRAINT accounts_roll_number UNIQUE (roll_unique)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE email_verifications (
  token_hash VARCHAR(64) PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  expires_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT email_verifications_account_fk FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE access_grants (
  email VARCHAR(150) PRIMARY KEY,
  role VARCHAR(15) NOT NULL,
  granted_by CHAR(36) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT access_grants_role_check CHECK (role IN ('student', 'admin')),
  CONSTRAINT access_grants_granted_by_fk FOREIGN KEY (granted_by) REFERENCES accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE updates (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  category VARCHAR(20) NOT NULL,
  domain VARCHAR(20) NOT NULL,
  event_at TIMESTAMP(6) NULL,
  location VARCHAR(150) NOT NULL DEFAULT '',
  author_id CHAR(36) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT updates_category_check CHECK (category IN ('Announcement', 'Hackathon', 'Event', 'Organisation', 'News')),
  CONSTRAINT updates_domain_check CHECK (domain IN ('All domains', 'CANSAT', 'ROCKET', 'DRONES', 'ROBOTICS', 'ROVERS')),
  CONSTRAINT updates_author_fk FOREIGN KEY (author_id) REFERENCES accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE INDEX updates_latest ON updates (created_at DESC);

CREATE TABLE notification_reads (
  account_id CHAR(36) NOT NULL,
  update_id CHAR(36) NOT NULL,
  PRIMARY KEY (account_id, update_id),
  CONSTRAINT notification_reads_account_fk FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT notification_reads_update_fk FOREIGN KEY (update_id) REFERENCES updates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE teams (
  domain VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT teams_domain_check CHECK (domain IN ('CANSAT', 'ROCKET', 'DRONES', 'ROBOTICS', 'ROVERS')),
  CONSTRAINT teams_progress_check CHECK (progress BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO teams (domain, name) VALUES ('CANSAT', 'CANSAT research team'), ('ROCKET', 'Rocket research team'), ('DRONES', 'Drone research team'), ('ROBOTICS', 'Robotics research team'), ('ROVERS', 'Rover research team');

CREATE TABLE team_memberships (
  account_id CHAR(36) NOT NULL,
  domain VARCHAR(20) NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (account_id, domain),
  CONSTRAINT team_memberships_status_check CHECK (status IN ('pending', 'approved')),
  CONSTRAINT team_memberships_account_fk FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT team_memberships_domain_fk FOREIGN KEY (domain) REFERENCES teams(domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tasks (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  domain VARCHAR(20) NOT NULL,
  assigned_to CHAR(36) NOT NULL,
  due DATE NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_by CHAR(36) NOT NULL,
  CONSTRAINT tasks_domain_fk FOREIGN KEY (domain) REFERENCES teams(domain),
  CONSTRAINT tasks_assigned_to_fk FOREIGN KEY (assigned_to) REFERENCES accounts(id),
  CONSTRAINT tasks_created_by_fk FOREIGN KEY (created_by) REFERENCES accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE INDEX assigned_tasks ON tasks (assigned_to, due);

CREATE TABLE budget_entries (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  domain VARCHAR(20) NOT NULL,
  kind VARCHAR(15) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT budget_entries_kind_check CHECK (kind IN ('allocation', 'expense')),
  CONSTRAINT budget_entries_amount_check CHECK (amount > 0),
  CONSTRAINT budget_entries_domain_fk FOREIGN KEY (domain) REFERENCES teams(domain),
  CONSTRAINT budget_entries_created_by_fk FOREIGN KEY (created_by) REFERENCES accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
