require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const db = require("../config/db");
// Re-runnable index additions. DDL may partially apply; fix the reported issue and rerun.
const indexes = [
  ["visits", "idx_visits_date", "visit_date"],
  ["visits", "idx_visits_patient_date", "patient_id, visit_date"],
  ["appointments", "idx_appointments_date", "preferred_date, preferred_time"],
  [
    "appointments",
    "idx_appointments_status_date",
    "status, preferred_date, preferred_time",
  ],
  ["queue", "idx_queue_today", "queue_date, status, priority, queue_number"],
  ["password_reset_tokens", "idx_reset_hash", "token_hash"],
  [
    "admin_notifications",
    "idx_admin_notification_read",
    "admin_id, is_read, created_at",
  ],
];
(async () => {
  try {
    const client = db.promise();
    const [duplicates] = await client.query(`SELECT COUNT(*) AS total FROM
      (SELECT LOWER(TRIM(email)) FROM users GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1) duplicates`);
    if (Number(duplicates[0].total))
      throw new Error(
        "Duplicate account emails found. Resolve them before adding uniqueness; no accounts were deleted.",
      );
    const sql = fs.readFileSync(
      path.join(__dirname, "../../database/migrations/20261009_deployment.sql"),
      "utf8",
    );
    for (const statement of sql.split(";").filter((part) => part.trim()))
      await client.query(statement);
    const securitySql = fs.readFileSync(path.join(__dirname, '../../database/migrations/20261010_security.sql'), 'utf8');
    for (const statement of securitySql.split(';').filter(part => part.trim())) await client.query(statement);
    for (const [table, index, columns] of [
      ...indexes,
      ["users", "unique_user_email", "email"],
    ]) {
      const [present] = await client.execute(
        `SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [table, index],
      );
      if (!present.length) {
        if (table === "users")
          await client.query("UPDATE users SET email = LOWER(TRIM(email))");
        await client.query(
          `CREATE ${table === "users" ? "UNIQUE " : ""}INDEX ${index} ON ${table} (${columns})`,
        );
        console.log("Added index:", index);
      }
    }
    console.log(
      "Deployment migration complete. Existing clinic records retained.",
    );
  } catch (error) {
    console.error("Migration failed:", error.code || error.message);
    process.exitCode = 1;
  } finally {
    await db.promise().end();
  }
})();
