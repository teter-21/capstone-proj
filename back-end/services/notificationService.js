const db = require("../config/db");

/* Create a notification for a patient. */
const createNotification = ({
  patient_id,
  title,
  message,
  type = "general",
}) => {
  return new Promise((resolve, reject) => {
    const sql = `
            INSERT INTO notifications
            (patient_id, title, message, type, is_read)
            VALUES (?, ?, ?, ?, 0)
        `;

    db.query(sql, [patient_id, title, message, type], (err, result) => {
      if (err) {
        console.error("Create patient notification error:", err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

/* Send the same notification to every admin account. */
const createAdminNotification = ({ title, message, type = "general" }) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT id FROM users WHERE role = 'admin'", (err, admins) => {
      if (err) {
        console.error("Find admin accounts error:", err);
        return reject(err);
      }

      if (!admins.length) {
        return resolve({ affectedRows: 0 });
      }

      const values = admins.map((admin) => [admin.id, title, message, type, 0]);

      const sql = `
                    INSERT INTO admin_notifications
                    (admin_id, title, message, type, is_read)
                    VALUES ?
                `;

      db.query(sql, [values], (insertErr, result) => {
        if (insertErr) {
          console.error("Create admin notification error:", insertErr);
          return reject(insertErr);
        }
        resolve(result);
      });
    });
  });
};

module.exports = {
  createNotification,
  createAdminNotification,
};
