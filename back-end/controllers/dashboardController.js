const db = require("../config/db");

/* |||| GET ADMIN DASHBOARD SUMMARY |||| */

exports.getDashboardSummary = (req, res) => {
  const queries = {
    /* Total registered patients */
    totalPatients: `
            SELECT COUNT(*) AS total
            FROM patients
        `,

    /* Pending online appointments */
    pendingAppointments: `
            SELECT COUNT(*) AS total
            FROM appointments
            WHERE status = 'Pending'
        `,

    /* Today's appointments */
    todayAppointments: `
            SELECT COUNT(*) AS total
            FROM appointments
            WHERE preferred_date = CURDATE()
        `,

    /* Total payments */
    totalRevenue: `
            SELECT COALESCE(
                SUM(amount_paid),
                0
            ) AS total
            FROM visits
        `,
  };

  db.query(queries.totalPatients, (err, patientsResult) => {
    if (err) {
      console.error("Total patients error:", err);

      return res.status(500).json({
        message: "Unable to load patient statistics.",
      });
    }

    db.query(queries.pendingAppointments, (err, pendingResult) => {
      if (err) {
        console.error("Pending appointments error:", err);

        return res.status(500).json({
          message: "Unable to load appointment statistics.",
        });
      }

      db.query(queries.todayAppointments, (err, todayResult) => {
        if (err) {
          console.error("Today's appointments error:", err);

          return res.status(500).json({
            message: "Unable to load today's appointments.",
          });
        }

        db.query(queries.totalRevenue, (err, revenueResult) => {
          if (err) {
            console.error("Revenue error:", err);

            return res.status(500).json({
              message: "Unable to load revenue statistics.",
            });
          }

          res.json({
            totalPatients: patientsResult[0].total,

            pendingAppointments: pendingResult[0].total,

            todayAppointments: todayResult[0].total,

            totalRevenue: revenueResult[0].total,
          });
        });
      });
    });
  });
};

/* |||| GET MONTHLY REVENUE |||| 
Returns revenue for the current month and prev 5 months */

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

/* |||| GET TOP PROCEDURES ||||
Gets the most requested procedures for this month */

exports.getTopProcedures = (req, res) => {
  const sql = `

        SELECT

            procedure_name AS name,

            COUNT(*) AS count

        FROM visits

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
            procedure_name

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
