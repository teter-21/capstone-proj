const DUPLICATE_WARNING = "This time and date already has an appointment. Please choose another time and date.";
const OVERLAP_WARNING = "Appointments must be at least 1 hour apart. Please choose another time and date.";
function seconds(time) {
  const [h, m, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
function validateSchedule(date, time, now = Date.now()) {
  if (typeof date !== "string" || typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) return "Enter a valid appointment date and time.";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return "Enter a valid appointment date.";
  if (date < new Date(now + 8 * 3600000).toISOString().slice(0, 10)) return "Appointment date cannot be in the past.";
  if (parsed.getUTCDay() === 0) return "Appointments are available Monday to Saturday only. Please choose another date.";
  if (seconds(time) < 36000 || seconds(time) > 64800) return "Appointment start times must be between 10:00 AM and 6:00 PM.";
  return null;
}
async function checkApprovedConflict(connection, date, time, excludeId = null) {
  const [rows] = await connection.execute(`SELECT preferred_time FROM appointments
    WHERE status = 'Approved' AND preferred_date = ? AND (? IS NULL OR id <> ?)`, [date, excludeId, excludeId]);
  const differences = rows.map(row => Math.abs(seconds(row.preferred_time) - seconds(time)));
  if (differences.includes(0)) return DUPLICATE_WARNING;
  return differences.some(difference => difference < 3600) ? OVERLAP_WARNING : null;
}
// All application scheduling writes take this same database-scoped lock before
// opening a transaction, so concurrent approvals cannot pass stale checks.
async function acquireScheduleLock(connection) {
  const [rows] = await connection.execute("SELECT GET_LOCK(SHA2(CONCAT('clinic:schedule:', DATABASE()), 256), 5) AS acquired");
  if (Number(rows[0]?.acquired) !== 1) {
    const error = new Error("The appointment schedule is busy. Please try again.");
    error.status = 503;
    throw error;
  }
}
async function releaseScheduleConnection(connection, locked) {
  if (!connection) return;
  if (locked) {
    try {
      const [rows] = await connection.execute("SELECT RELEASE_LOCK(SHA2(CONCAT('clinic:schedule:', DATABASE()), 256)) AS released");
      if (Number(rows[0]?.released) !== 1) throw new Error("Schedule lock release failed");
    } catch (error) {
      console.error("Schedule lock cleanup failed:", error.code || error.name);
      connection.destroy();
      return;
    }
  }
  connection.release();
}
module.exports = { validateSchedule, checkApprovedConflict, acquireScheduleLock, releaseScheduleConnection, DUPLICATE_WARNING, OVERLAP_WARNING };
