const db = require("../config/db");
const bcrypt = require("bcrypt");
const { roles } = require("../services/permissions");
const { passwordError } = require("../services/passwordPolicy");

function requireMainAdmin(req, res) {
  if (req.user?.role !== "admin" || Number(req.user?.is_main_admin) !== 1) {
    res.status(403).json({
      message: "Only the main admin can manage admin accounts.",
    });
    return false;
  }

  return true;
}

/* Create a staff administrator. */
exports.createAdmin = async (req, res) => {
  if (!requireMainAdmin(req, res)) return;

  const fullname = String(req.body.fullname || "").trim();
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = req.body.password;
  const staffRole = req.body.staff_role || 'front_desk';
  if (!Object.hasOwn(roles, staffRole)) return res.status(400).json({ message: 'Choose a valid staff role.' });

  if (
    fullname.length < 2 ||
    fullname.length > 150 ||
    email.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      message: "Enter a valid full name and email address.",
    });
  }

  const passwordIssue = passwordError(password);

  if (passwordIssue) {
    return res.status(400).json({ message: passwordIssue });
  }

  try {
    const client = db.promise();

    const [existing] = await client.execute(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [email],
    );

    if (existing.length) {
      return res.status(400).json({
        message: "That email address is already in use.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await client.execute(
      `INSERT INTO users
       (patient_id, fullname, email, password, role, is_main_admin, staff_role)
       VALUES (NULL, ?, ?, ?, 'admin', 0, ?)`,
      [fullname, email, hashedPassword, staffRole],
    );

    return res.status(201).json({
      message: "Admin account created successfully.",
      admin: {
        id: result.insertId,
        fullname,
        email,
        role: "admin",
        is_main_admin: 0,
      },
    });
  } catch (error) {
    console.error("Create admin failed:", error.code || error.name);

    return res.status(error.code === "ER_DUP_ENTRY" ? 400 : 500).json({
      message:
        error.code === "ER_DUP_ENTRY"
          ? "That email address is already in use."
          : "Unable to create admin account.",
    });
  }
};

/* List administrators. */
exports.getAdmins = async (req, res) => {
  if (!requireMainAdmin(req, res)) return;

  try {
    const [admins] = await db.promise().query(
      `SELECT id, fullname, email, role, is_main_admin, staff_role, created_at
       FROM users
       WHERE role = 'admin'
       ORDER BY is_main_admin DESC, id ASC`,
    );

    return res.json(admins);
  } catch (error) {
    console.error("Load admins failed:", error.code || error.name);

    return res.status(500).json({
      message: "Unable to load admin accounts.",
    });
  }
};

/* Delete staff and revoke their sessions atomically. */
exports.deleteAdmin = async (req, res) => {
  if (!requireMainAdmin(req, res)) return;

  const targetId = Number(req.params.id);
  const actorId = Number(req.user.id);

  if (!Number.isSafeInteger(targetId) || targetId < 1) {
    return res.status(400).json({
      message: "Invalid admin account.",
    });
  }

  if (targetId === actorId) {
    return res.status(403).json({
      message: "You cannot delete your own account.",
    });
  }

  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Recheck the caller's current permissions inside the transaction.
    const [[actor]] = await connection.execute(
      `SELECT role, is_main_admin
       FROM users WHERE id = ? FOR UPDATE`,
      [actorId],
    );

    if (!actor || actor.role !== "admin" || Number(actor.is_main_admin) !== 1) {
      await connection.rollback();

      return res.status(403).json({
        message: "Only the main admin can delete staff accounts.",
      });
    }

    const [[target]] = await connection.execute(
      `SELECT id, role, is_main_admin
       FROM users WHERE id = ? FOR UPDATE`,
      [targetId],
    );

    if (!target || target.role !== "admin") {
      await connection.rollback();

      return res.status(404).json({
        message: "Staff admin account not found.",
      });
    }

    if (Number(target.is_main_admin || 0) !== 0) {
      await connection.rollback();

      return res.status(403).json({
        message: "The main admin account cannot be deleted.",
      });
    }

    await connection.execute("DELETE FROM auth_sessions WHERE user_id = ?", [
      targetId,
    ]);

    await connection.execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ?",
      [targetId],
    );

    await connection.execute(
      "DELETE FROM admin_notifications WHERE admin_id = ?",
      [targetId],
    );

    const [result] = await connection.execute(
      `DELETE FROM users
       WHERE id = ?
         AND role = 'admin'
         AND COALESCE(is_main_admin, 0) = 0`,
      [targetId],
    );

    if (result.affectedRows !== 1) {
      throw new Error("Staff account was not deleted.");
    }

    await connection.execute('INSERT INTO access_audit (actor_id, target_id, action, detail) VALUES (?, ?, ?, ?)', [actorId, targetId, 'staff_deleted', 'Access revoked']);
    await connection.commit();

    return res.json({
      message: "Staff account deleted. Their system access has been revoked.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Delete admin failed:", error.code || error.name);

    return res.status(500).json({
      message: "Unable to delete the staff account. Please try again.",
    });
  } finally {
    connection?.release();
  }
};

exports.updateRole = async (req, res) => {
  if (!requireMainAdmin(req, res)) return;
  if (!Object.hasOwn(roles, req.body.staff_role)) return res.status(400).json({ message: 'Choose a valid staff role.' });
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [[target]] = await connection.execute('SELECT id, is_main_admin FROM users WHERE id = ? AND role = \'admin\' FOR UPDATE', [req.params.id]);
    if (!target || Number(target.is_main_admin) === 1) {
      await connection.rollback();
      return res.status(403).json({ message: 'Only staff roles can be changed.' });
    }
    await connection.execute('UPDATE users SET staff_role = ? WHERE id = ?', [req.body.staff_role, target.id]);
    await connection.execute('DELETE FROM auth_sessions WHERE user_id = ?', [target.id]);
    await connection.execute('INSERT INTO access_audit (actor_id, target_id, action, detail) VALUES (?, ?, ?, ?)', [req.user.id, target.id, 'staff_role_changed', req.body.staff_role]);
    await connection.commit();
    return res.json({ message: 'Role updated. Staff must sign in again.' });
  } catch (error) {
    await connection?.rollback().catch(() => {});
    console.error('Role update failed:', error.code || error.name);
    return res.status(500).json({ message: 'Unable to update role.' });
  } finally { connection?.release(); }
};
