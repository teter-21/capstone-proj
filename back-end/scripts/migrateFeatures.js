// Add columns without resetting existing clinic data.
module.exports = async function migrateFeatures(client) {
  const columns = {
    users: { staff_role: "VARCHAR(20) NOT NULL DEFAULT 'front_desk'" },
    patients: { birthdate: 'DATE NULL', is_pwd: 'TINYINT(1) NOT NULL DEFAULT 0' },
    appointments: { treatments: 'JSON NULL', duration_minutes: 'INT UNSIGNED NOT NULL DEFAULT 60' },
    visits: { treatment_items: 'JSON NULL', invoice_items: 'JSON NULL', subtotal: 'DECIMAL(10,2) NULL',
      discount_amount: 'DECIMAL(10,2) NOT NULL DEFAULT 0', discount_basis: "VARCHAR(20) NOT NULL DEFAULT 'none'",
      discount_status: "VARCHAR(20) NOT NULL DEFAULT 'legacy'", discount_reason: 'VARCHAR(255) NULL',
      invoice_status: "VARCHAR(20) NOT NULL DEFAULT 'legacy'", invoice_version: 'INT UNSIGNED NOT NULL DEFAULT 0' },
  };
  for (const [table, fields] of Object.entries(columns)) for (const [column, definition] of Object.entries(fields)) {
    const [present] = await client.execute(`SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
    if (!present.length) await client.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
  for (const [table, column] of [['appointments', 'service'], ['queue', 'service'], ['visits', 'procedure_name']]) {
    const [[info]] = await client.execute(`SELECT CHARACTER_MAXIMUM_LENGTH AS size FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
    if (Number(info.size) < 2000) await client.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` VARCHAR(2000)`);
  }
  await client.query(`CREATE TABLE IF NOT EXISTS access_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_id INT NOT NULL, target_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, detail TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  await client.query(`CREATE TABLE IF NOT EXISTS invoice_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, visit_id INT NOT NULL, actor_id INT NOT NULL,
    snapshot JSON NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invoice_audit_visit (visit_id, id)
  ) ENGINE=InnoDB`);
};
