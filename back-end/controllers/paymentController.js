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
exports.recordPayment = (req, res) => {
  const visitId = Number(req.body.visit_id);
  const amount = toMoney(req.body.amount);
  const paymentMethod = String(req.body.payment_method || "Cash").trim();
  const referenceNumber = String(req.body.reference_number || "").trim();
  const notes = String(req.body.notes || "").trim();

  const methodsRequiringReference = ["GCash", "Card", "Bank Transfer"];

  if (methodsRequiringReference.includes(paymentMethod) && !referenceNumber) {
    return res.status(400).json({
      message:
        "Reference number is required for GCash, Card, or Bank Transfer payments.",
    });
  }

  if (!Number.isInteger(visitId) || visitId <= 0) {
    return res.status(400).json({ message: "A valid visit is required." });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ message: "Payment amount must be greater than zero." });
  }

  const allowedMethods = ["Cash", "GCash", "Card", "Bank Transfer"];
  if (!allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({ message: "Invalid payment method." });
  }

  db.beginTransaction((transactionError) => {
    if (transactionError) {
      console.error("Payment transaction start error:", transactionError);
      return res
        .status(500)
        .json({ message: "Unable to start payment transaction." });
    }

    const visitSql = `
            SELECT id, patient_id, COALESCE(amount_paid, 0) AS amount_paid, COALESCE(balance, 0) AS balance
            FROM visits
            WHERE id = ?
            FOR UPDATE
        `;

    db.query(visitSql, [visitId], (visitError, visits) => {
      if (visitError) {
        return db.rollback(() => {
          console.error("Payment visit lookup error:", visitError);
          res.status(500).json({ message: "Unable to retrieve the visit." });
        });
      }

      if (!visits.length) {
        return db.rollback(() => {
          res.status(404).json({ message: "Visit record not found." });
        });
      }

      const visit = visits[0];
      const currentBalance = Number(visit.balance || 0);

      if (currentBalance <= 0) {
        return db.rollback(() => {
          res
            .status(400)
            .json({ message: "This visit has no remaining balance." });
        });
      }

      if (amount > currentBalance) {
        return db.rollback(() => {
          res.status(400).json({
            message: `Payment cannot exceed the remaining balance of ₱${currentBalance.toFixed(2)}.`,
          });
        });
      }

      const newPaid = Number(visit.amount_paid || 0) + amount;
      const newBalance = Math.max(0, currentBalance - amount);

      const updateVisitSql = `
                UPDATE visits
                SET amount_paid = ?, balance = ?
                WHERE id = ?
            `;

      db.query(
        updateVisitSql,
        [newPaid, newBalance, visitId],
        (updateError) => {
          if (updateError) {
            return db.rollback(() => {
              console.error("Payment visit update error:", updateError);
              res
                .status(500)
                .json({ message: "Unable to update the visit balance." });
            });
          }

          const insertPaymentSql = `
                    INSERT INTO payments
                    (visit_id, patient_id, amount, payment_method, reference_number, notes, paid_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;

          db.query(
            insertPaymentSql,
            [
              visitId,
              visit.patient_id,
              amount,
              paymentMethod,
              referenceNumber || null,
              notes || null,
            ],
            (insertError, paymentResult) => {
              if (insertError) {
                return db.rollback(() => {
                  console.error("Payment insert error:", insertError);
                  res.status(500).json({
                    message:
                      "Unable to save the payment. No balance changes were made.",
                  });
                });
              }

              db.commit((commitError) => {
                if (commitError) {
                  return db.rollback(() => {
                    console.error("Payment commit error:", commitError);
                    res
                      .status(500)
                      .json({ message: "Unable to complete the payment." });
                  });
                }

                res.status(201).json({
                  message: "Payment recorded successfully.",
                  payment: {
                    id: paymentResult.insertId,
                    visit_id: visitId,
                    amount,
                    payment_method: paymentMethod,
                    reference_number: referenceNumber || null,
                    amount_paid: newPaid,
                    balance: newBalance,
                  },
                });
              });
            },
          );
        },
      );
    });
  });
};
