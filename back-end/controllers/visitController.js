const db = require("../config/db");

/*  ADD VISIT  */
exports.addVisit = (req, res) => {
  const {
    patient_id,
    visit_date,
    visit_time,
    procedure_name,
    complain,
    description,
    amount_paid,
    balance,
  } = req.body;

  if (!patient_id || !visit_date || !visit_time || !procedure_name) {
    return res.status(400).json({
      message: "Please complete all required fields.",
    });
  }

  const sql = `
        INSERT INTO visits
        (
            patient_id,
            visit_date,
            visit_time,
            procedure_name,
            complain,
            description,
            amount_paid,
            balance
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

  db.query(
    sql,
    [
      patient_id,
      visit_date,
      visit_time,
      procedure_name,
      complain,
      description,
      amount_paid,
      balance,
    ],
    (err, result) => {
      if (err) {
        console.error(err);

        return res.status(500).json({
          message: "Unable to add visit.",
        });
      }

      res.status(201).json({
        message: "Visit Added Successfully",
        visitId: result.insertId,
      });
    },
  );
};

/*  GET VISITS OF A PATIENT  */
exports.getVisits = (req, res) => {
  const sql = `
        SELECT *
        FROM visits
        WHERE patient_id = ?
        ORDER BY visit_date DESC, visit_time DESC
    `;

  db.query(sql, [req.params.patient_id], (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        message: "Unable to retrieve visits.",
      });
    }

    res.status(200).json(result);
  });
};

/* ==================== PATIENT - VIEW OWN VISIT / TREATMENT HISTORY ==================== */

exports.getMyVisits = (req, res) => {
  const patientId = req.user.patient_id;

  if (!patientId) {
    return res.status(400).json({
      message: "Your account is not linked to a patient record.",
    });
  }

  const sql = `
        SELECT
            id,
            patient_id,
            visit_date,
            visit_time,
            procedure_name,
            complain,
            description,
            amount_paid,
            balance,
            created_at
        FROM visits
        WHERE patient_id = ?
        ORDER BY visit_date DESC, visit_time DESC
    `;

  db.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error("Get patient visits error:", err);

      return res.status(500).json({
        message: "Unable to load treatment history.",
      });
    }

    res.json(results);
  });
};

/* ==================== PATIENT - VIEW PAYMENT HISTORY ==================== */

exports.getMyPayments = (req, res) => {
  const patientId = req.user.patient_id;

  if (!patientId) {
    return res.status(400).json({
      message: "Your account is not linked to a patient record.",
    });
  }

  const sql = `
        SELECT
            id,
            visit_date,
            visit_time,
            procedure_name,
            amount_paid,
            balance,
            created_at
        FROM visits
        WHERE patient_id = ?
        ORDER BY visit_date DESC, visit_time DESC
    `;

  db.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error("Get patient payments error:", err);

      return res.status(500).json({
        message: "Unable to load payment history.",
      });
    }

    let totalPaid = 0;
    let totalBalance = 0;
    let unpaidVisits = 0;

    results.forEach((visit) => {
      totalPaid += Number(visit.amount_paid || 0);

      totalBalance += Number(visit.balance || 0);

      if (Number(visit.balance || 0) > 0) {
        unpaidVisits++;
      }
    });

    res.json({
      summary: {
        totalPaid: totalPaid,

        totalBalance: totalBalance,

        unpaidVisits: unpaidVisits,

        totalVisits: results.length,
      },

      payments: results,
    });
  });
};
