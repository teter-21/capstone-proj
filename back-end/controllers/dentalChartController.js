const db = require("../config/db");

const VALID_CONDITIONS = [
  "Healthy",
  "Cavity",
  "Filled",
  "Missing",
  "Extracted",
  "Cracked",
  "Impacted",
  "Root Canal",
  "Crown",
  "Other",
];

const validToothNumber = (value) =>
  /^(1[1-8]|2[1-8]|3[1-8]|4[1-8])$/.test(String(value));

exports.getDentalChart = (req, res) => {
  const patientId = Number(req.params.patient_id);

  if (!patientId) {
    return res.status(400).json({ message: "Invalid patient ID." });
  }

  const sql = `
        SELECT
            id,
            patient_id,
            tooth_number,
            condition_name,
            notes,
            updated_at
        FROM dental_chart
        WHERE patient_id = ?
        ORDER BY tooth_number ASC
    `;

  db.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error("Get dental chart error:", err);
      return res.status(500).json({
        message: "Unable to load dental chart.",
      });
    }

    res.json(results);
  });
};

exports.saveToothCondition = (req, res) => {
  const patientId = Number(req.params.patient_id);
  const toothNumber = String(req.params.tooth_number);
  const conditionName = String(req.body.condition_name || "").trim();
  const notes = String(req.body.notes || "").trim() || null;

  if (!patientId || !validToothNumber(toothNumber)) {
    return res
      .status(400)
      .json({ message: "Invalid patient or tooth number." });
  }

  if (!VALID_CONDITIONS.includes(conditionName)) {
    return res.status(400).json({ message: "Invalid dental condition." });
  }

  const patientSql = `SELECT id FROM patients WHERE id = ? LIMIT 1`;

  db.query(patientSql, [patientId], (patientErr, patientResult) => {
    if (patientErr) {
      console.error("Dental chart patient lookup error:", patientErr);
      return res.status(500).json({ message: "Unable to verify patient." });
    }

    if (patientResult.length === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const sql = `
            INSERT INTO dental_chart
            (patient_id, tooth_number, condition_name, notes)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                condition_name = VALUES(condition_name),
                notes = VALUES(notes),
                updated_at = CURRENT_TIMESTAMP
        `;

    db.query(sql, [patientId, toothNumber, conditionName, notes], (err) => {
      if (err) {
        console.error("Save dental chart error:", err);
        return res.status(500).json({
          message: "Unable to save dental chart.",
        });
      }

      res.json({
        message: `Tooth #${toothNumber} updated successfully.`,
        tooth: {
          patient_id: patientId,
          tooth_number: toothNumber,
          condition_name: conditionName,
          notes,
        },
      });
    });
  });
};

exports.clearToothCondition = (req, res) => {
  const patientId = Number(req.params.patient_id);
  const toothNumber = String(req.params.tooth_number);

  if (!patientId || !validToothNumber(toothNumber)) {
    return res
      .status(400)
      .json({ message: "Invalid patient or tooth number." });
  }

  const sql = `
        DELETE FROM dental_chart
        WHERE patient_id = ? AND tooth_number = ?
    `;

  db.query(sql, [patientId, toothNumber], (err) => {
    if (err) {
      console.error("Clear dental chart error:", err);
      return res.status(500).json({
        message: "Unable to clear tooth condition.",
      });
    }

    res.json({
      message: `Tooth #${toothNumber} cleared successfully.`,
    });
  });
};
