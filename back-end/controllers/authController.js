const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/*  LOGIN  */
exports.login = (req, res) => {
  const emailValue = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");

  if (!emailValue || !password) {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  db.query(
    "SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
    [emailValue],
    async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Database error.",
        });
      }

      if (result.length === 0) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      const user = result[0];

      try {
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
          return res.status(401).json({
            message: "Invalid email or password.",
          });
        }

        const token = jwt.sign(
          {
            id: user.id,
            role: user.role,
            patient_id: user.patient_id,
            is_main_admin: Number(user.is_main_admin || 0),
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "1h",
          },
        );

        res.json({
          token,
          role: user.role,
          id: user.id,
          is_main_admin: Number(user.is_main_admin || 0),
          fullname: user.fullname,
          patient_id: user.patient_id,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Login failed.",
        });
      }
    },
  );
};

/*  CREATE PATIENT ACCOUNT  */

exports.createAccount = async (req, res) => {
  const patientId = Number(req.body.patient_id);
  const cleanName = String(req.body.fullname || "").trim();
  const cleanEmail = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");

  if (!patientId || !cleanName || !cleanEmail || !password) {
    return res.status(400).json({
      message: "Please fill in all required fields.",
    });
  }

  if (!Number.isInteger(patientId) || patientId < 1) {
    return res.status(400).json({ message: "Invalid patient ID." });
  }

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res
      .status(400)
      .json({ message: "Please enter a valid email address." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    db.query(
      "SELECT id, name FROM patients WHERE id = ? LIMIT 1",
      [patientId],
      async (patientErr, patientResult) => {
        if (patientErr) {
          console.error("Patient account lookup error:", patientErr);
          return res.status(500).json({ message: "Unable to create account." });
        }

        if (patientResult.length === 0) {
          return res.status(404).json({ message: "Patient record not found." });
        }

        db.query(
          "SELECT id FROM users WHERE patient_id = ? LIMIT 1",
          [patientId],
          async (accountErr, accountResult) => {
            if (accountErr) {
              console.error("Patient account check error:", accountErr);
              return res
                .status(500)
                .json({ message: "Unable to create account." });
            }

            if (accountResult.length > 0) {
              return res.status(400).json({
                message: "This patient already has an account.",
              });
            }

            db.query(
              "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
              [cleanEmail],
              async (emailErr, emailResult) => {
                if (emailErr) {
                  console.error("Account email check error:", emailErr);
                  return res
                    .status(500)
                    .json({ message: "Unable to create account." });
                }

                if (emailResult.length > 0) {
                  return res
                    .status(400)
                    .json({ message: "Email already exists." });
                }

                try {
                  const hashedPassword = await bcrypt.hash(password, 12);

                  db.query(
                    `INSERT INTO users
                                        (patient_id, fullname, email, password, role)
                                        VALUES (?, ?, ?, ?, 'patient')`,
                    [
                      patientId,
                      patientResult[0].name || cleanName,
                      cleanEmail,
                      hashedPassword,
                    ],
                    (insertErr) => {
                      if (insertErr) {
                        console.error(
                          "Create patient account error:",
                          insertErr,
                        );
                        if (insertErr.code === "ER_DUP_ENTRY") {
                          return res
                            .status(400)
                            .json({ message: "Email already exists." });
                        }
                        return res
                          .status(500)
                          .json({ message: "Unable to create account." });
                      }

                      return res.status(201).json({
                        message: "Patient account created successfully.",
                      });
                    },
                  );
                } catch (hashError) {
                  console.error("Password hashing error:", hashError);
                  return res
                    .status(500)
                    .json({ message: "Unable to create account." });
                }
              },
            );
          },
        );
      },
    );
  } catch (error) {
    console.error("Create account error:", error);
    return res.status(500).json({ message: "Unable to create account." });
  }
};

/* Get the logged-in user's account information. */
exports.getMyAccount = (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT id, patient_id, fullname, email, role
         FROM users
         WHERE id = ?
         LIMIT 1`,
    [userId],
    (err, results) => {
      if (err) {
        console.error("Get account error:", err);
        return res.status(500).json({
          message: "Unable to load account information.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Account not found.",
        });
      }

      res.json(results[0]);
    },
  );
};

/* Update the account and change the password when a new one is provided. */
exports.updateMyAccount = async (req, res) => {
  const userId = req.user.id;
  const { fullname, email, currentPassword, newPassword } = req.body;

  if (!fullname || !email) {
    return res.status(400).json({
      message: "Full name and email are required.",
    });
  }

  const cleanName = fullname.trim();
  const cleanEmail = email.trim();

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({
      message: "Full name and email are required.",
    });
  }

  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters.",
    });
  }

  try {
    db.query(
      "SELECT id, password FROM users WHERE id = ? LIMIT 1",
      [userId],
      async (err, results) => {
        if (err) {
          console.error("Account lookup error:", err);
          return res.status(500).json({
            message: "Unable to update account.",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            message: "Account not found.",
          });
        }

        if (newPassword) {
          if (!currentPassword) {
            return res.status(400).json({
              message: "Enter your current password before changing it.",
            });
          }

          const passwordMatches = await bcrypt.compare(
            currentPassword,
            results[0].password,
          );

          if (!passwordMatches) {
            return res.status(400).json({
              message: "Current password is incorrect.",
            });
          }
        }

        db.query(
          "SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1",
          [cleanEmail, userId],
          async (emailErr, emailResults) => {
            if (emailErr) {
              console.error("Email check error:", emailErr);
              return res.status(500).json({
                message: "Unable to update account.",
              });
            }

            if (emailResults.length > 0) {
              return res.status(400).json({
                message: "That email address is already in use.",
              });
            }

            let sql;
            let values;

            if (newPassword) {
              const hashedPassword = await bcrypt.hash(newPassword, 12);
              sql = `UPDATE users
                                   SET fullname = ?, email = ?, password = ?
                                   WHERE id = ?`;
              values = [cleanName, cleanEmail, hashedPassword, userId];
            } else {
              sql = `UPDATE users
                                   SET fullname = ?, email = ?
                                   WHERE id = ?`;
              values = [cleanName, cleanEmail, userId];
            }

            db.query(sql, values, (updateErr) => {
              if (updateErr) {
                console.error("Update account error:", updateErr);
                return res.status(500).json({
                  message: "Unable to update account.",
                });
              }

              res.json({
                message: newPassword
                  ? "Account information and password updated successfully."
                  : "Account information updated successfully.",
              });
            });
          },
        );
      },
    );
  } catch (error) {
    console.error("Account update error:", error);
    res.status(500).json({
      message: "Unable to update account.",
    });
  }
};

/* Send a one-time password reset link without revealing whether an email exists. */
exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email address is required." });
  }

  try {
    /* Only continue when the email exactly matches an account stored in the database. */
    db.query(
      `SELECT id, fullname, email, role
             FROM users
             WHERE LOWER(TRIM(email)) = ?
               AND email IS NOT NULL
               AND TRIM(email) <> ''
             LIMIT 1`,
      [email],
      async (err, results) => {
        if (err) {
          console.error("Forgot password lookup error:", err);
          return res
            .status(500)
            .json({ message: "Unable to process the request." });
        }

        if (results.length === 0) {
          return res.json({
            message:
              "Reset link is sent, if does not receive any your email is not registered to this account.",
          });
        }

        const user = results[0];

        /* The reset email is always taken from the matched database account.
                   The requester can never choose a different destination email. */
        if (!user.email || user.email.trim().toLowerCase() !== email) {
          return res.json({
            message:
              "Reset link is sent, if does not receive any your email is not registered to this account.",
          });
        }

        const crypto = require("crypto");
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");

        db.query(
          "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
          [user.id],
          (updateErr) => {
            if (updateErr) {
              console.error("Reset token cleanup error:", updateErr);
              return res
                .status(500)
                .json({ message: "Unable to process the request." });
            }

            db.query(
              `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
              [user.id, tokenHash],
              async (insertErr) => {
                if (insertErr) {
                  console.error("Reset token insert error:", insertErr);
                  return res
                    .status(500)
                    .json({ message: "Unable to process the request." });
                }

                const frontendUrl =
                  process.env.FRONTEND_URL || "http://localhost:5173";
                const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

                try {
                  const {
                    sendPasswordResetEmail,
                  } = require("../services/emailService");
                  await sendPasswordResetEmail(user, resetUrl);
                  return res.json({
                    message:
                      "If an account with that email exists, a password reset link has been sent.",
                  });
                } catch (emailError) {
                  console.error("Password reset email error:", emailError);
                  db.query(
                    "DELETE FROM password_reset_tokens WHERE token_hash = ?",
                    [tokenHash],
                  );
                  return res.status(500).json({
                    message:
                      "Unable to send the reset email. Please try again later.",
                  });
                }
              },
            );
          },
        );
      },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Unable to process the request." });
  }
};

/* Check a reset token before showing the password form. */
exports.verifyResetToken = (req, res) => {
  const rawToken = String(req.query.token || "");

  if (!rawToken) {
    return res
      .status(400)
      .json({ valid: false, message: "Reset link is missing." });
  }

  const crypto = require("crypto");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  db.query(
    `SELECT id FROM password_reset_tokens
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
         LIMIT 1`,
    [tokenHash],
    (err, results) => {
      if (err) {
        console.error("Reset token verification error:", err);
        return res
          .status(500)
          .json({ valid: false, message: "Unable to verify the reset link." });
      }

      if (results.length === 0) {
        return res.status(400).json({
          valid: false,
          message: "This reset link is invalid or has expired.",
        });
      }

      return res.json({ valid: true });
    },
  );
};

/* Set the new password and permanently use the reset token. */
exports.resetPassword = async (req, res) => {
  const rawToken = String(req.body.token || "");
  const newPassword = String(req.body.newPassword || "");

  if (!rawToken || !newPassword) {
    return res
      .status(400)
      .json({ message: "Reset token and new password are required." });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters." });
  }

  const crypto = require("crypto");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  try {
    db.query(
      `SELECT id, user_id FROM password_reset_tokens
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
             LIMIT 1`,
      [tokenHash],
      async (err, results) => {
        if (err) {
          console.error("Reset password lookup error:", err);
          return res
            .status(500)
            .json({ message: "Unable to reset the password." });
        }

        if (results.length === 0) {
          return res
            .status(400)
            .json({ message: "This reset link is invalid or has expired." });
        }

        const resetRecord = results[0];
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        db.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, resetRecord.user_id],
          (updateErr) => {
            if (updateErr) {
              console.error("Password update error:", updateErr);
              return res
                .status(500)
                .json({ message: "Unable to reset the password." });
            }

            db.query(
              "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
              [resetRecord.id],
              (tokenErr) => {
                if (tokenErr) {
                  console.error("Reset token update error:", tokenErr);
                  return res.status(500).json({
                    message:
                      "Password changed, but the reset link could not be closed.",
                  });
                }

                return res.json({
                  message:
                    "Password changed successfully. You can now sign in.",
                });
              },
            );
          },
        );
      },
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Unable to reset the password." });
  }
};
