-- Additive migration: no DROP TABLE, no deletion, no seed account replacement.
-- Run against the existing clinic database. Required by updated booking routes.
CREATE TABLE IF NOT EXISTS email_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NULL,
  event_type VARCHAR(30) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending','processing','accepted','failed') NOT NULL DEFAULT 'pending',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_token CHAR(36) NULL,
  message_id VARCHAR(255) NULL,
  last_error VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  INDEX idx_email_dispatch (status, available_at, id),
  INDEX idx_email_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Atomic daily numbering preserves existing queue records and permits harmless gaps.
CREATE TABLE IF NOT EXISTS queue_daily_sequence (
  queue_date DATE NOT NULL PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL
) ENGINE=InnoDB;
