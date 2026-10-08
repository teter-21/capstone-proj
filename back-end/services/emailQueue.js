const { randomUUID } = require("node:crypto");
const db = require("../config/db");
const email = require("./emailService");
const handlers = {
  submitted: email.sendAppointmentSubmittedEmail,
  approved: email.sendAppointmentApprovedEmail,
  cancelled: email.sendAppointmentCancelledEmail,
  rescheduled: email.sendAppointmentRescheduledEmail,
};
async function enqueueAppointmentEmail(connection, type, appointment) {
  if (!handlers[type]) throw new Error("Unsupported appointment email type.");
  const payload = JSON.stringify({
    id: appointment.id,
    fullname: appointment.fullname,
    email: appointment.email,
    preferred_date: appointment.preferred_date,
    preferred_time: appointment.preferred_time,
    service: appointment.service,
  });
  await connection.execute(
    `INSERT INTO email_outbox (event_type, appointment_id, payload) VALUES (?, ?, ?)`,
    [type, appointment.id, payload],
  );
}
let running = false;
let stopped = true;
let timer;
async function processEmailQueue() {
  if (running) return;
  running = true;
  let connection;
  let jobs = [];
  const lease = randomUUID();
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    [jobs] =
      await connection.query(`SELECT id, event_type, payload, attempts FROM email_outbox
      WHERE status IN ('pending', 'processing') AND available_at <= NOW() AND attempts < 6
      ORDER BY id LIMIT 5 FOR UPDATE SKIP LOCKED`);
    for (const job of jobs) {
      await connection.execute(
        `UPDATE email_outbox SET status = 'processing', attempts = attempts + 1,
        lease_token = ?, available_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?`,
        [lease, job.id],
      );
    }
    await connection.commit();
    connection.release();
    connection = undefined;
    for (const job of jobs) {
      if (stopped) break; // Leases become eligible again after restart.
      try {
        const payload =
          typeof job.payload === "string"
            ? JSON.parse(job.payload)
            : job.payload;

        const result = await handlers[job.event_type](payload);
        await db.promise().execute(
          `UPDATE email_outbox SET status = 'accepted', message_id = ?,
          accepted_at = NOW(), payload = '{}', last_error = NULL, lease_token = NULL
          WHERE id = ? AND lease_token = ?`,
          [result.messageId || null, job.id, lease],
        );
        console.log("Appointment email accepted:", job.id, job.event_type);
      } catch (error) {
        const permanent = error.retryable === false || job.attempts + 1 >= 6;
        const delay = Math.min(3600, 30 * 2 ** job.attempts);
        await db.promise().execute(
          `UPDATE email_outbox SET status = ?, lease_token = NULL,
          last_error = ?, available_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id = ? AND lease_token = ?`,
          [
            permanent ? "failed" : "pending",
            String(error.code || error.name || "EMAIL_FAILED").slice(0, 100),
            delay,
            job.id,
            lease,
          ],
        );
        console.error(
          "Appointment email attempt failed:",
          job.id,
          error.code || error.name,
        );
      }
    }
    // Abandoned final attempts must not remain permanently stuck as 'processing'.
    await db.promise()
      .query(`UPDATE email_outbox SET status = 'failed', lease_token = NULL,
      last_error = 'LEASE_EXPIRED' WHERE status = 'processing' AND attempts >= 6 AND available_at <= NOW()`);
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(
      "Email queue unavailable:",
      error.code || error.name,
      "Check the deployment migration.",
    );
  } finally {
    if (connection) connection.release();
    running = false;
  }
}
function startEmailQueue() {
  stopped = false;
  void processEmailQueue();
  timer = setInterval(() => void processEmailQueue(), 30000);
  timer.unref();
}
function stopEmailQueue() {
  stopped = true;
  clearInterval(timer);
}
module.exports = {
  enqueueAppointmentEmail,
  startEmailQueue,
  stopEmailQueue,
  processEmailQueue,
};
