const jwt = require("jsonwebtoken");
const db = require("../config/db");

/* Verify the token and confirm that the account is still active. */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    db.query(
      `SELECT id, role, patient_id, is_main_admin
             FROM users
             WHERE id = ?
             LIMIT 1`,
      [decoded.id],
      (err, results) => {
        if (err) {
          console.error("Authentication lookup error:", err);
          return res.status(500).json({
            message: "Unable to verify your account.",
          });
        }

        if (results.length === 0) {
          return res.status(401).json({
            message: "Account is no longer available.",
          });
        }

        const user = results[0];

        /* Use current database permissions instead of trusting old JWT role data. */
        req.user = {
          id: user.id,
          role: user.role,
          patient_id: user.patient_id,
          is_main_admin: Number(user.is_main_admin || 0),
        };

        next();
      },
    );
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};
