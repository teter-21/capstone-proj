const db = require("../config/db");

const { createVisit } = require('../services/visits');
exports.addVisit = async (req, res) => {
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const id = await createVisit(connection, Number(req.body.patient_id), req.body);
    await connection.commit();
    return res.status(201).json({ message: 'Visit saved. Complete its invoice in Billing.', visitId: id });
  } catch (error) {
    await connection?.rollback().catch(() => {});
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save visit.' });
  } finally { connection?.release(); }
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
            procedure_name, invoice_status, subtotal, discount_amount, discount_basis, invoice_items,
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
            procedure_name, invoice_status, subtotal, discount_amount, discount_basis, invoice_items,
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
