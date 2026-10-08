ALTER TABLE updates DROP CHECK updates_domain_check;
ALTER TABLE updates ADD CONSTRAINT updates_domain_check
    CHECK (domain IN ('All domains', 'CANSAT', 'CUBESAT', 'ROCKET', 'DRONES', 'ROBOTICS', 'ROVERS'));

ALTER TABLE teams DROP CHECK teams_domain_check;
ALTER TABLE teams ADD CONSTRAINT teams_domain_check
    CHECK (domain IN ('CANSAT', 'CUBESAT', 'ROCKET', 'DRONES', 'ROBOTICS', 'ROVERS'));

INSERT INTO teams (domain, name) VALUES ('CUBESAT', 'CubeSat research team');
