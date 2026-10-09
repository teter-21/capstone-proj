export const DUPLICATE_WARNING = "This time and date already has an appointment. Please choose another time and date.";
export const OVERLAP_WARNING = "Appointments must be at least 1 hour apart. Please choose another time and date.";
function seconds(time) {
  const [h, m, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
export function validateSchedule(date, time, now = Date.now()) {
  if (typeof date !== "string" || typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) return "Enter a valid appointment date and time.";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return "Enter a valid appointment date.";
  if (date < new Date(now + 8 * 3600000).toISOString().slice(0, 10)) return "Appointment date cannot be in the past.";
  if (parsed.getUTCDay() === 0) return "Appointments are available Monday to Saturday only. Please choose another date.";
  if (seconds(time) < 36000 || seconds(time) > 64800) return "Appointment start times must be between 10:00 AM and 6:00 PM.";
  return null;
}

export const clinicToday = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
export const isSunday = date => date && new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
// MySQL date/time strings are clinic wall time (+08:00), independent of the viewer's timezone.
const appointmentInstant = appointment => Date.parse(
  `${String(appointment.preferred_date || "").slice(0, 10)}T${String(appointment.preferred_time || "").padEnd(8, ":00")}+08:00`,
);
export const compareAppointments = (a, b, now = Date.now()) => {
  const aUpcoming = appointmentInstant(a) >= now;
  const bUpcoming = appointmentInstant(b) >= now;
  return Number(bUpcoming) - Number(aUpcoming) ||
    String(a.preferred_date || "").slice(0, 10).localeCompare(String(b.preferred_date || "").slice(0, 10)) ||
    String(a.preferred_time || "").localeCompare(String(b.preferred_time || "")) || Number(a.id) - Number(b.id);
};
