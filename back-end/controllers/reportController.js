const db = require("../config/db");

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

const getDateRange = (req) => {
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);

  let startDate = req.query.start_date;
  let endDate = req.query.end_date;

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate = firstDay.toISOString().slice(0, 10);
    endDate = todayString;
  }

  return { startDate, endDate };
};

/* |||| ADMIN - AUTOMATIC REPORT All values are calculated directly from the database. |||| */
exports.getReports = (req, res) => {
  const { startDate, endDate } = getDateRange(req);
  const group = req.query.group === "day" ? "day" : "month";
  const procedure = req.query.procedure || "";

  const visitWhere = `
        v.visit_date BETWEEN ? AND ?
        ${procedure ? "AND v.procedure_name = ?" : ""}
    `;

  const visitParams = procedure
    ? [startDate, endDate, procedure]
    : [startDate, endDate];

  const summarySql = `
        SELECT
            (SELECT COUNT(*) FROM patients) AS totalPatients,
            (SELECT COUNT(*) FROM visits v WHERE ${visitWhere}) AS totalVisits,
            (SELECT COALESCE(SUM(v.amount_paid), 0) FROM visits v WHERE ${visitWhere}) AS totalRevenue,
            (SELECT COALESCE(SUM(v.balance), 0) FROM visits v WHERE ${visitWhere}) AS outstandingBalance
    `;

  const detailSql = `
        SELECT
            v.id,
            v.visit_date,
            v.visit_time,
            v.patient_id,
            COALESCE(p.name, 'Unknown Patient') AS patient,
            v.procedure_name AS procedure_name,
            v.amount_paid,
            v.balance,
            v.complain,
            v.description
        FROM visits v
        LEFT JOIN patients p ON p.id = v.patient_id
        WHERE ${visitWhere}
        ORDER BY v.visit_date DESC, v.visit_time DESC, v.id DESC
        LIMIT 200
    `;

  const procedureSql = `
        SELECT
            v.procedure_name AS name,
            COUNT(*) AS value
        FROM visits v
        WHERE ${visitWhere}
            AND v.procedure_name IS NOT NULL
            AND v.procedure_name <> ''
        GROUP BY v.procedure_name
        ORDER BY value DESC
        LIMIT 8
    `;

  const trendSql =
    group === "day"
      ? `
            SELECT
                DATE_FORMAT(MIN(v.visit_date), '%b %d') AS name,
                COALESCE(SUM(v.amount_paid), 0) AS value
            FROM visits v
            WHERE ${visitWhere}
            GROUP BY DATE(v.visit_date)
            ORDER BY DATE(v.visit_date) ASC
        `
      : `
            SELECT
                DATE_FORMAT(MIN(v.visit_date), '%b %Y') AS name,
                COALESCE(SUM(v.amount_paid), 0) AS value
            FROM visits v
            WHERE ${visitWhere}
            GROUP BY YEAR(v.visit_date), MONTH(v.visit_date)
            ORDER BY YEAR(v.visit_date), MONTH(v.visit_date)
        `;

  const params = visitParams;

  db.query(
    summarySql,
    [...params, ...params, ...params],
    (summaryError, summaryResult) => {
      if (summaryError) {
        console.error("Report summary error:", summaryError);
        return res
          .status(500)
          .json({ message: "Unable to generate report summary." });
      }

      db.query(procedureSql, params, (procedureError, procedureResult) => {
        if (procedureError) {
          console.error("Report procedure error:", procedureError);
          return res
            .status(500)
            .json({ message: "Unable to generate procedure report." });
        }

        db.query(trendSql, params, (trendError, trendResult) => {
          if (trendError) {
            console.error("Report trend error:", trendError);
            return res
              .status(500)
              .json({ message: "Unable to generate revenue report." });
          }

          db.query(detailSql, params, (detailError, detailResult) => {
            if (detailError) {
              console.error("Report detail error:", detailError);
              return res
                .status(500)
                .json({ message: "Unable to generate detailed report." });
            }

            res.json({
              filters: {
                startDate,
                endDate,
                group,
                procedure: procedure || "All Procedures",
              },
              summary: {
                totalPatients: Number(summaryResult[0].totalPatients || 0),
                totalVisits: Number(summaryResult[0].totalVisits || 0),
                totalRevenue: Number(summaryResult[0].totalRevenue || 0),
                outstandingBalance: Number(
                  summaryResult[0].outstandingBalance || 0,
                ),
              },
              revenue: trendResult.map((row) => ({
                name: row.name,
                value: Number(row.value || 0),
              })),
              procedures: procedureResult.map((row) => ({
                name: row.name,
                value: Number(row.value || 0),
              })),
              details: detailResult.map((row) => ({
                ...row,
                amount_paid: Number(row.amount_paid || 0),
                balance: Number(row.balance || 0),
              })),
            });
          });
        });
      });
    },
  );
};

/* |||| ADMIN - AVAILABLE PROCEDURES |||| */
exports.getReportProcedures = (req, res) => {
  const sql = `
        SELECT DISTINCT procedure_name AS name
        FROM visits
        WHERE procedure_name IS NOT NULL
          AND procedure_name <> ''
        ORDER BY procedure_name ASC
    `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Report procedures error:", err);
      return res.status(500).json({ message: "Unable to load procedures." });
    }

    res.json(result);
  });
};
