const db = require("../config/db");
const { enqueueAppointmentEmail } = require("../services/emailQueue");
const { createAdminNotification } = require("../services/notificationService");
const statuses = ["Pending", "Approved", "Rescheduled", "Completed", "Cancelled"];
const emailEvents = { Approved: "approved", Cancelled: "cancelled", Rescheduled: "rescheduled" };
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function validateBooking(data) {
  if (!data.fullname || data.fullname.length > 150 || !emailPattern.test(data.email || "") || data.email.length > 100
    || !data.phone || data.phone.length > 20 || !data.service || data.service.length > 100) return "Enter valid patient, email, phone and service information.";
  return validateDateTime(data.preferred_date, data.preferred_time);
}
function validateDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time || "")) return "Enter a valid appointment date and time.";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) return "Enter a valid appointment date.";
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0,10);
  if (date < today) return "Appointment date cannot be in the past.";
  return null;
}
async function createBooking(req, res, portal) {
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    let data;
    let patientId = null;
    if (portal) {
      patientId = req.user.patient_id;
      if (!patientId) { await connection.rollback(); return res.status(400).json({ message: "Your account is not linked to a patient record." }); }
      const [rows] = await connection.execute(`SELECT p.phone, u.fullname, u.email FROM users u
        JOIN patients p ON p.id = u.patient_id WHERE u.id = ? AND u.patient_id = ? LIMIT 1`, [req.user.id, patientId]);
      if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Patient record not found." }); }
      data = { ...req.body, ...rows[0] };
    } else {
      data = { ...req.body, fullname: String(req.body.fullname || "").trim(), email: String(req.body.email || "").trim().toLowerCase(),
        phone: String(req.body.phone || "").trim(), service: String(req.body.service || "").trim() };
      // Link public submissions by existing patient account email, not a shared phone number.
      const [rows] = await connection.execute("SELECT patient_id FROM users WHERE email = ? AND role = 'patient' AND patient_id IS NOT NULL LIMIT 1", [data.email]);
      patientId = rows[0]?.patient_id || null;
    }
    const invalid = validateBooking(data);
    if (invalid) { await connection.rollback(); return res.status(400).json({ message: invalid }); }
    const [result] = await connection.execute(`INSERT INTO appointments
      (patient_id, fullname, email, phone, preferred_date, preferred_time, service, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`, [patientId, data.fullname, data.email, data.phone,
        data.preferred_date, data.preferred_time, data.service, data.reason || null]);
    await enqueueAppointmentEmail(connection, "submitted", { ...data, id: result.insertId });
    await connection.commit();
    createAdminNotification({ title: "New Appointment Request", message: `${data.fullname} submitted an appointment request for ${data.preferred_date} at ${data.preferred_time}.`, type: "new_appointment" })
      .catch((error) => console.error("Admin notification failed:", error.code || error.name));
    return res.status(201).json({ message: "Appointment submitted successfully. Please wait for confirmation.",
      appointmentId: result.insertId, patientLinked: Boolean(patientId), emailStatus: "queued" });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Appointment creation failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to submit appointment. Please try again." });
  } finally { if (connection) connection.release(); }
}
exports.createAppointment = (req, res) => createBooking(req, res, false);
exports.createPatientAppointment = (req, res) => createBooking(req, res, true);
exports.getAppointments = async (req, res) => {
  const { start_date: start, end_date: end } = req.query;
  const filtered = Boolean(start || end);
  if (filtered && (!/^\d{4}-\d{2}-\d{2}$/.test(start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(end || "") || start > end))
    return res.status(400).json({ message: "A valid date range is required." });
  try {
    const [rows] = await db.promise().execute(`SELECT * FROM appointments ${filtered ? "WHERE preferred_date BETWEEN ? AND ?" : ""}
      ORDER BY FIELD(status,'Pending','Approved','Completed','Cancelled','Rescheduled'), preferred_date, preferred_time`, filtered ? [start,end] : []);
    return res.json(rows);
  } catch (error) { console.error("Appointment list failed:", error.code); return res.status(500).json({ message: "Unable to retrieve appointments." }); }
};
async function updateBooking(req, res, reschedule) {
  const { id } = req.params;
  const status = reschedule ? "Rescheduled" : req.body.status;
  if (!statuses.includes(status)) return res.status(400).json({ message: "Invalid appointment status." });
  if (reschedule) {
    const invalid = validateDateTime(req.body.preferred_date, req.body.preferred_time);
    if (invalid) return res.status(400).json({ message: invalid });
  } else if (status === "Rescheduled") {
    return res.status(400).json({ message: "Use the reschedule action to choose a new date and time." });
  }
  let connection;
  let created = false;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute("SELECT * FROM appointments WHERE id = ? FOR UPDATE", [id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Appointment not found." }); }
    const appointment = rows[0];
    if (appointment.status === status && (!reschedule || (appointment.preferred_date === req.body.preferred_date
      && appointment.preferred_time.slice(0,5) === req.body.preferred_time.slice(0,5)))) {
      await connection.rollback(); return res.json({ message: `Appointment is already ${status}.`, patientId: appointment.patient_id, patientCreated: false, emailStatus: "unchanged" });
    }
    if (status === "Approved" && !appointment.patient_id) {
      const [patients] = await connection.execute("SELECT patient_id FROM users WHERE email = ? AND role = 'patient' AND patient_id IS NOT NULL LIMIT 1", [appointment.email]);
      if (patients.length) appointment.patient_id = patients[0].patient_id;
      else {
        const [patient] = await connection.execute(`INSERT INTO patients
          (name,address,phone,age,occupation,gender,status,complain,image) VALUES (?,'',?,NULL,'',NULL,'Single',?,NULL)`,
          [appointment.fullname, appointment.phone, appointment.reason || appointment.service]);
        appointment.patient_id = patient.insertId; created = true;
      }
    }
    if (reschedule) { appointment.preferred_date = req.body.preferred_date; appointment.preferred_time = req.body.preferred_time; }
    appointment.status = status;
    await connection.execute("UPDATE appointments SET patient_id = ?, status = ?, preferred_date = ?, preferred_time = ? WHERE id = ?",
      [appointment.patient_id, status, appointment.preferred_date, appointment.preferred_time, id]);
    if (appointment.patient_id && ["Approved","Cancelled","Completed","Rescheduled"].includes(status)) {
      await connection.execute("INSERT INTO notifications (patient_id,title,message,type) VALUES (?,?,?,?)",
        [appointment.patient_id, `Appointment ${status}`, reschedule ? `Your appointment has been rescheduled to ${appointment.preferred_date} at ${appointment.preferred_time}.` : `Your appointment has been marked as ${status.toLowerCase()}.`, status.toLowerCase()]);
    }
    if (emailEvents[status]) await enqueueAppointmentEmail(connection, emailEvents[status], appointment);
    await connection.commit();
    return res.json({ message: reschedule ? "Appointment rescheduled successfully." : `Appointment marked as ${status}.`,
      patientCreated: created, patientId: appointment.patient_id || null, emailStatus: emailEvents[status] ? "queued" : "not_required" });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Appointment update failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to update appointment." });
  } finally { if (connection) connection.release(); }
}
exports.updateAppointmentStatus = (req,res) => updateBooking(req,res,false);
exports.rescheduleAppointment = (req,res) => updateBooking(req,res,true);

exports.getMyAppointments = (req, res) => {
  const patientId = req.user.patient_id;

  if (!patientId) {
    return res.status(400).json({
      message: "Patient account is not linked to a patient record.",
    });
  }

  const sql = `
    SELECT
        a.id,
        a.fullname,
        a.email,
        a.phone,
        a.preferred_date,
        a.preferred_time,
        a.service,
        a.reason,
        a.status,
        a.created_at,

        q.id AS queue_id,
        q.queue_number,
        q.queue_type,
        q.priority,
        q.status AS queue_status,
        q.check_in_time,
        q.called_at,
        q.treatment_started_at,
        q.completed_at

    FROM appointments a

    LEFT JOIN queue q
        ON q.appointment_id = a.id

    WHERE a.patient_id = ?

    ORDER BY
        a.preferred_date ASC,
        a.preferred_time ASC,
        a.id DESC
`;

  db.query(sql, [patientId], (err, result) => {
    if (err) {
      console.error("Get my appointments error:", err);

      return res.status(500).json({
        message: "Unable to retrieve appointments.",
      });
    }

    res.json(result);
  });
};

