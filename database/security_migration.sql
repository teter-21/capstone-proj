-- Security migration for Magno Dental Clinic
-- Run this only if is_main_admin does not already exist in users.

ALTER TABLE users
ADD COLUMN is_main_admin TINYINT(1) NOT NULL DEFAULT 0;

-- Keep the original main administrator as the only main admin.
-- Change id = 1 if your original main admin uses a different user ID.
UPDATE users
SET is_main_admin = 1
WHERE id = 1 AND role = 'admin';
