# Latest update: active admin appointments only

If you installed the previous upcoming/scroll update, replace only these two files in your existing project:

1. back-end/controllers/appointmentController.js
2. front-end/src/pages/admin/AppointmentMngmt.jsx

Restart your backend and frontend (or redeploy both on Render). Keep your current environment files, Cloudflare allowedHosts, database and uploads. No database migration or dependency installation is required for this change.

The admin appointment table now shows exactly Pending, Rescheduled and Approved appointments. Completed and Cancelled appointments are hidden from this table and its count. Completing or cancelling an appointment removes it on the next successful reload; it is not deleted from the database. All active statuses are shown, including overdue requests; the existing upcoming-first, chronological ordering is retained.

The table requests /appointments?active_only=true and also filters the returned data before display. Other callers, including the calendar and patient history, retain access to historical statuses. Appointment restrictions and quiet background refresh from the previous update are included in this full project ZIP.

44 automated tests, frontend lint, and frontend build passed. API and loader tests verify active-only filtering. Live database/browser verification was not available. To verify installation, create examples of all five statuses and check that only Pending, Rescheduled and Approved appear in the admin table; completing an Approved appointment should remove its row without removing the database record.
