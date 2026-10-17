const db = require("../config/db");

/* |||| GET ADMIN DASHBOARD SUMMARY |||| */

exports.getDashboardSummary = async (req, res) => {
  try {
    const [[counts]] = await db.promise().query(`SELECT
      (SELECT COUNT(*) FROM patients) AS totalPatients,
      (SELECT COUNT(*) FROM appointments WHERE status = 'Pending') AS pendingAppointments,
      (SELECT COUNT(*) FROM appointments WHERE preferred_date = CURDATE()) AS todayAppointments`);
    if (require('../services/permissions').can(req.user, 'reports.read')) {
      const [[money]] = await db.promise().query('SELECT COALESCE(SUM(amount_paid),0) AS totalRevenue FROM visits');
      counts.totalRevenue = money.totalRevenue;
    }
    return res.json(counts);
  } catch (error) { return res.status(500).json({ message: 'Unable to load dashboard.' }); }
};

/* GET MONTHLY REVENUE */

exports.getMonthlyRevenue = (req, res) => {
  const sql = `

        SELECT

            YEAR(visit_date) AS year,

            MONTH(visit_date) AS month,

            COALESCE(
                SUM(amount_paid),
                0
            ) AS revenue

        FROM visits

        WHERE visit_date >=
            DATE_SUB(
                DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                ),
                INTERVAL 5 MONTH
            )

        GROUP BY
            YEAR(visit_date),
            MONTH(visit_date)

        ORDER BY
            YEAR(visit_date),
            MONTH(visit_date)

    `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Monthly revenue error:", err);

      return res.status(500).json({
        message: "Unable to load monthly revenue.",
      });
    }

    res.json(result);
  });
};

/* GET TOP PROCEDURES */

exports.getTopProcedures = (req, res) => {
  const sql = `

        SELECT

            item.name AS name,

            COUNT(*) AS count

        FROM visits v JOIN JSON_TABLE(COALESCE(v.treatment_items, JSON_ARRAY(JSON_OBJECT('name', v.procedure_name))),
          '$[*]' COLUMNS(name VARCHAR(2000) PATH '$.name')) item ON TRUE

        WHERE

            procedure_name IS NOT NULL

            AND procedure_name != ''

            AND visit_date >=
                DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                )

            AND visit_date <
                DATE_ADD(
                    DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-01'
                    ),
                    INTERVAL 1 MONTH
                )

        GROUP BY
            item.name

        ORDER BY
            count DESC

        LIMIT 5

    `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Top procedures error:", err);

      return res.status(500).json({
        message: "Unable to load procedures.",
      });
    }

    /*  CALCULATE TOTAL PROCEDURES  */

    const total = result.reduce((sum, item) => sum + Number(item.count), 0);

    /*  ADD PERCENTAGE  */

    const procedures = result.map((item) => {
      const percent =
        total > 0 ? Math.round((Number(item.count) / total) * 100) : 0;

      return {
        name: item.name,

        count: Number(item.count),

        percent,
      };
    });

    res.json(procedures);
  });
};
