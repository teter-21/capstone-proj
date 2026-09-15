const db = require("../config/db");
const bcrypt = require("bcrypt");

/* Only the main admin can manage admin accounts. */
const requireMainAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({
      message: "Only administrators can manage admin accounts.",
    });
    return false;
  }

  if (req.user?.is_main_admin !== 1) {
    res.status(403).json({
      message: "Only the main admin can manage admin accounts.",
    });
    return false;
  }

  return true;
};

/* Create a new admin account. */
exports.createAdmin = async (req, res) => {
  if (!requireMainAdmin(req, res)) return;

  const { fullname, email, password } = req.body;
  const cleanName = String(fullname || "").trim();
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    return res.status(400).json({
      message: "Full name, email, and password are required.",
    });
  }

  if (cleanName.length < 2) {
    return res.status(400).json({
      message: "Please enter a valid full name.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters.",
    });
  }

  try {
    db.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [cleanEmail],
      async (checkError, existing) => {
        if (checkError) {
          console.error("Admin email check error:", checkError);
          return res.status(500).json({
            message: "Unable to check the email address.",
          });
        }

        if (existing.length > 0) {
          return res.status(400).json({
            message: "That email address is already in use.",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        db.query(
          `INSERT INTO users
                    (patient_id, fullname, email, password, role, is_main_admin)
                    VALUES (NULL, ?, ?, ?, 'admin', 0)`,
          [cleanName, cleanEmail, hashedPassword],
          (insertError, result) => {
            if (insertError) {
              console.error("Create admin error:", insertError);

              if (insertError.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                  message: "That email address is already in use.",
                });
              }

              return res.status(500).json({
                message: "Unable to create admin account.",
              });
            }

            res.status(201).json({
              message: "Admin account created successfully.",
              admin: {
                id: result.insertId,
                fullname: cleanName,
                email: cleanEmail,
                role: "admin",
                is_main_admin: 0,
              },
            });
          },
        );
      },
    );
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({
      message: "Unable to create admin account.",
    });
  }
};

/* Load the admin accounts for the main admin. */
exports.getAdmins = (req, res) => {
  if (!requireMainAdmin(req, res)) return;

  db.query(
    `SELECT id, fullname, email, role, is_main_admin, created_at
         FROM users
         WHERE role = 'admin'
         ORDER BY is_main_admin DESC, id ASC`,
    (err, results) => {
      if (err) {
        console.error("Get admins error:", err);
        return res.status(500).json({
          message: "Unable to load admin accounts.",
        });
      }

      res.json(results);
    },
  );
};
