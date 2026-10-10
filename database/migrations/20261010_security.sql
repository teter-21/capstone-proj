-- Additive migration: no clinic records or accounts are deleted.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_expiry (expires_at),
  INDEX idx_session_user (user_id),
  CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS security_rate_limits (
  bucket_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  window_started BIGINT UNSIGNED NOT NULL,
  hits INT UNSIGNED NOT NULL,
  last_seen BIGINT UNSIGNED NOT NULL,
  INDEX idx_rate_cleanup (last_seen)
) ENGINE=InnoDB;
