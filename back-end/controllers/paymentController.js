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
    conditions.push("COALESCE(v.balance, 0) = 0 AND v.invoice_status <> 'draft'");
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
            v.invoice_status, v.invoice_version, v.subtotal, v.discount_amount, v.discount_status, v.discount_basis,
            COALESCE(v.amount_paid, 0) AS amount_paid,
            COALESCE(v.balance, 0) AS balance,
            COALESCE(v.amount_paid, 0) + COALESCE(v.balance, 0) AS total_charge,
            CASE
                WHEN v.invoice_status = 'draft' THEN 'Draft'
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
            COALESCE(SUM(CASE WHEN invoice_status <> 'draft' AND COALESCE(balance, 0) <= 0 THEN 1 ELSE 0 END), 0) AS paidVisits,
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
  let amount;
  try { amount = cents(req.body.amount) / 100; }
  catch (error) { return res.status(400).json({ message: error.message }); }
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
    const [visits] = await connection.execute(`SELECT id, patient_id, invoice_status, invoice_version, COALESCE(amount_paid,0) AS amount_paid,
      COALESCE(balance,0) AS balance FROM visits WHERE id = ? FOR UPDATE`, [visitId]);
    if (!visits.length) { await connection.rollback(); return res.status(404).json({ message: "Visit record not found." }); }
    const visit = visits[0];
    if (visit.invoice_status === 'draft' || Number(req.body.invoice_version) !== Number(visit.invoice_version)) {
      await connection.rollback();
      return res.status(409).json({ message: 'Complete or refresh the invoice before recording payment.' });
    }
    const balance = toMoney(visit.balance);
    if (balance <= 0 || amount > balance) {
      await connection.rollback();
      return res.status(400).json({ message: balance <= 0 ? "This visit has no remaining balance." : `Payment cannot exceed the remaining balance of ₱${balance.toFixed(2)}.` });
    }
    const paid = toMoney(Number(visit.amount_paid) + amount);
    const remaining = toMoney(balance - amount);
    await connection.execute("UPDATE visits SET amount_paid = ?, balance = ?, invoice_version = invoice_version + 1 WHERE id = ?", [paid, remaining, visitId]);
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

const { parseItems, calculateInvoice, eligibility, fail, cents } = require('../services/billing');
exports.getInvoice = async (req, res) => {
  try {
    const [[visit]] = await db.promise().execute(`SELECT v.id, v.patient_id, v.visit_date, v.procedure_name,
      v.treatment_items, v.invoice_items, v.invoice_status, v.invoice_version, v.subtotal, v.discount_amount,
      v.discount_basis, v.discount_status, v.discount_reason, v.amount_paid, v.balance,
      p.name AS patient_name, p.birthdate, p.is_pwd FROM visits v JOIN patients p ON p.id = v.patient_id WHERE v.id = ?`, [req.params.id]);
    if (!visit) return res.status(404).json({ message: 'Invoice not found.' });
    const items = parseItems(visit.invoice_items) || (parseItems(visit.treatment_items) || [{ name: visit.procedure_name }]).map(item => ({ name: item.name, amount: '' }));
    const [audit] = await db.promise().execute('SELECT actor_id, snapshot, created_at FROM invoice_audit WHERE visit_id = ? ORDER BY id DESC LIMIT 20', [visit.id]);
    return res.json({ ...visit, items, eligibility: eligibility(visit, visit.visit_date), audit });
  } catch (error) {
    console.error('Invoice lookup failed:', error.code || error.name);
    return res.status(500).json({ message: 'Unable to load invoice.' });
  }
};
exports.saveInvoice = async (req, res) => {
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [[visit]] = await connection.execute('SELECT * FROM visits WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!visit) fail('Invoice not found.', 404);
    if (visit.invoice_status === 'legacy') fail('Historical charges are retained and cannot be repriced here.', 409);
    if (Number(visit.amount_paid) !== 0) fail('Payments already exist. This invoice cannot be repriced.', 409);
    if (Number(req.body.invoice_version) !== Number(visit.invoice_version)) fail('Invoice changed. Reopen it before saving.', 409);
    const [[patient]] = await connection.execute('SELECT birthdate, is_pwd FROM patients WHERE id = ? FOR UPDATE', [visit.patient_id]);
    const treatments = parseItems(visit.treatment_items) || [];
    const items = req.body.items;
    if (!Array.isArray(items) || items.length !== treatments.length || items.some((item, index) => item.name !== treatments[index].name)) fail('Invoice items must match the saved treatments.');
    const bill = calculateInvoice(patient, items, req.body.discount_status, req.body.discount_reason, visit.visit_date);
    await connection.execute(`UPDATE visits SET invoice_items = ?, subtotal = ?, discount_amount = ?, discount_basis = ?,
      discount_status = ?, discount_reason = ?, balance = ?, invoice_status = 'final', invoice_version = invoice_version + 1 WHERE id = ?`,
      [JSON.stringify(bill.items), bill.subtotal, bill.discount_amount, bill.discount_basis, bill.discount_status, bill.discount_reason, bill.total, visit.id]);
    await connection.execute('INSERT INTO invoice_audit (visit_id, actor_id, snapshot) VALUES (?, ?, ?)',
      [visit.id, req.user.id, JSON.stringify({ ...bill, birthdate: patient.birthdate, is_pwd: patient.is_pwd, previous: { subtotal: visit.subtotal, discount_amount: visit.discount_amount, discount_status: visit.discount_status } })]);
    await connection.commit();
    return res.json({ message: 'Invoice saved.', invoice: bill });
  } catch (error) {
    await connection?.rollback().catch(() => {});
    console.error('Invoice save failed:', error.code || error.name);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save invoice.' });
  } finally { connection?.release(); }
};
