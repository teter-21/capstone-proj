const db = require("../config/db");

const toMoney = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN;
};

/* |||||| ADMIN - BILLING RECORDS Uses the existing visits table as the source of charges. |||||| */
exports.getBillingRecords = (req, res) => {
  const status = req.query.status || "all";
  const search = String(req.query.search || "").trim();

  const conditions = ["1 = 1"];
  const params = [];

  if (status === "paid") {
    conditions.push("COALESCE(v.balance, 0) = 0");
  } else if (status === "balance") {
    conditions.push("COALESCE(v.balance, 0) > 0");
  } else if (status === "unpaid") {
    conditions.push(
      "COALESCE(v.amount_paid, 0) = 0 AND COALESCE(v.balance, 0) > 0",
    );
  }

  if (search) {
    conditions.push(
      "(p.name LIKE ? OR v.procedure_name LIKE ? OR CAST(v.id AS CHAR) LIKE ?)",
    );
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const sql = `
        SELECT
            v.id,
            v.patient_id,
            COALESCE(p.name, 'Unknown Patient') AS patient_name,
            v.visit_date,
            v.visit_time,
            v.procedure_name,
            COALESCE(v.amount_paid, 0) AS amount_paid,
            COALESCE(v.balance, 0) AS balance,
            COALESCE(v.amount_paid, 0) + COALESCE(v.balance, 0) AS total_charge,
            CASE
                WHEN COALESCE(v.balance, 0) <= 0 THEN 'Paid'
                WHEN COALESCE(v.amount_paid, 0) <= 0 THEN 'Unpaid'
                ELSE 'Balance Due'
            END AS payment_status
        FROM visits v
        LEFT JOIN patients p ON p.id = v.patient_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY v.visit_date DESC, v.visit_time DESC, v.id DESC
        LIMIT 300
    `;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Billing records error:", err);
      return res
        .status(500)
        .json({ message: "Unable to load billing records." });
    }

    res.json(
      results.map((row) => ({
        ...row,
        amount_paid: Number(row.amount_paid || 0),
        balance: Number(row.balance || 0),
        total_charge: Number(row.total_charge || 0),
      })),
    );
  });
};

/* |||||| ADMIN - BILLING SUMMARY |||||| */
exports.getBillingSummary = (req, res) => {
  const sql = `
        SELECT
            COUNT(*) AS totalVisits,
            COALESCE(SUM(COALESCE(amount_paid, 0)), 0) AS totalPaid,
            COALESCE(SUM(COALESCE(balance, 0)), 0) AS totalBalance,
            COALESCE(SUM(CASE WHEN COALESCE(balance, 0) <= 0 THEN 1 ELSE 0 END), 0) AS paidVisits,
            COALESCE(SUM(CASE WHEN COALESCE(amount_paid, 0) = 0 AND COALESCE(balance, 0) > 0 THEN 1 ELSE 0 END), 0) AS unpaidVisits
        FROM visits
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Billing summary error:", err);
      return res
        .status(500)
        .json({ message: "Unable to load billing summary." });
    }

    const row = results[0] || {};

    res.json({
      totalVisits: Number(row.totalVisits || 0),
      totalPaid: Number(row.totalPaid || 0),
      totalBalance: Number(row.totalBalance || 0),
      paidVisits: Number(row.paidVisits || 0),
      unpaidVisits: Number(row.unpaidVisits || 0),
    });
  });
};

/* |||||| ADMIN - RECORD PAYMENT Adds a payment transaction and reduces the visit balance. |||||| */
exports.recordPayment = async (req, res) => {
  const visitId = Number(req.body.visit_id);
  const amount = toMoney(req.body.amount);
  const method = String(req.body.payment_method || "Cash").trim();
  const reference = String(req.body.reference_number || "").trim();
  const notes = String(req.body.notes || "").trim();
  if (!Number.isInteger(visitId) || visitId <= 0) return res.status(400).json({ message: "A valid visit is required." });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Payment amount must be greater than zero." });
  if (!["Cash", "GCash", "Card", "Bank Transfer"].includes(method)) return res.status(400).json({ message: "Invalid payment method." });
  if (method !== "Cash" && !reference) return res.status(400).json({ message: "Reference number is required for GCash, Card, or Bank Transfer payments." });
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [visits] = await connection.execute(`SELECT id, patient_id, COALESCE(amount_paid,0) AS amount_paid,
      COALESCE(balance,0) AS balance FROM visits WHERE id = ? FOR UPDATE`, [visitId]);
    if (!visits.length) { await connection.rollback(); return res.status(404).json({ message: "Visit record not found." }); }
    const visit = visits[0];
    const balance = toMoney(visit.balance);
    if (balance <= 0 || amount > balance) {
      await connection.rollback();
      return res.status(400).json({ message: balance <= 0 ? "This visit has no remaining balance." : `Payment cannot exceed the remaining balance of ₱${balance.toFixed(2)}.` });
    }
    const paid = toMoney(Number(visit.amount_paid) + amount);
    const remaining = toMoney(balance - amount);
    await connection.execute("UPDATE visits SET amount_paid = ?, balance = ? WHERE id = ?", [paid, remaining, visitId]);
    const [payment] = await connection.execute(`INSERT INTO payments
      (visit_id, patient_id, amount, payment_method, reference_number, notes, paid_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [visitId, visit.patient_id, amount, method, reference || null, notes || null]);
    await connection.commit();
    return res.status(201).json({ message: "Payment recorded successfully.", payment: { id: payment.insertId,
      visit_id: visitId, amount, payment_method: method, reference_number: reference || null, amount_paid: paid, balance: remaining } });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Payment transaction failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to complete the payment. Refresh the visit before retrying." });
  } finally { if (connection) connection.release(); }
};
