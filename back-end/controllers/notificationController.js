const db = require("../config/db");

/* |||| GET PATIENT NOTIFICATIONS |||| */

exports.getMyNotifications = (req, res) => {
  const patientId = req.user.patient_id;

  if (!patientId) {
    return res.status(400).json({
      message: "Your account is not linked to a patient.",
    });
  }

  const sql = `
        SELECT
            id,
            title,
            message,
            type,
            is_read,
            created_at

        FROM notifications

        WHERE patient_id = ?

        ORDER BY created_at DESC
    `;

  db.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error("Notification error:", err);

      return res.status(500).json({
        message: "Unable to load notifications.",
      });
    }

    res.json(results);
  });
};

/* |||| MARK NOTIFICATION AS READ |||| */

exports.markAsRead = (req, res) => {
  const patientId = req.user.patient_id;
  const notificationId = req.params.id;

  const sql = `
        UPDATE notifications

        SET is_read = 1

        WHERE id = ?
        AND patient_id = ?
    `;

  db.query(sql, [notificationId, patientId], (err) => {
    if (err) {
      console.error("Mark notification error:", err);

      return res.status(500).json({
        message: "Unable to update notification.",
      });
    }

    res.json({
      message: "Notification marked as read.",
    });
  });
};

/* Get notifications for the logged-in admin. */
exports.getAdminNotifications = (req, res) => {
  const adminId = req.user.id;

  const sql = `
        SELECT id, title, message, type, is_read, created_at
        FROM admin_notifications
        WHERE admin_id = ?
        ORDER BY created_at DESC
    `;

  db.query(sql, [adminId], (err, results) => {
    if (err) {
      console.error("Admin notification error:", err);
      return res.status(500).json({
        message: "Unable to load admin notifications.",
      });
    }

    res.json(results);
  });
};

/* Mark one admin notification as read. */
exports.markAdminAsRead = (req, res) => {
  const adminId = req.user.id;
  const notificationId = req.params.id;

  const sql = `
        UPDATE admin_notifications
        SET is_read = 1
        WHERE id = ? AND admin_id = ?
    `;

  db.query(sql, [notificationId, adminId], (err) => {
    if (err) {
      console.error("Mark admin notification error:", err);
      return res.status(500).json({
        message: "Unable to update notification.",
      });
    }

    res.json({ message: "Notification marked as read." });
  });
};
