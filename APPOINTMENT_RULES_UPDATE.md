# Appointment scheduling update

Copy these six production files into the corresponding paths in your existing project:

- back-end/controllers/appointmentController.js
- back-end/services/appointmentSchedule.js (new)
- front-end/src/utils/appointmentSchedule.js (new)
- front-end/src/components/public/AppointmentForm.jsx
- front-end/src/pages/patient/BookPatientAppointment.jsx
- front-end/src/pages/admin/AppointmentMngmt.jsx

Keep your existing environment files, uploads, database, and Cloudflare hostname configuration. Restart the backend and frontend after copying the files. For Render, commit these files and redeploy the backend and frontend build. No new dependencies or database migration are required by this update.

## Rules

Appointments may start Monday through Saturday, from 10:00 AM through 6:00 PM inclusive. A 6:00 PM start is allowed, even though its one-hour duration ends at 7:00 PM. Sunday selection is rejected in the forms and on the server. Business dates use Philippine time.

Public bookings, patient portal bookings, admin approval and admin rescheduling check other Approved appointments on the same date. An exact duplicate returns:

“This time and date already has an appointment. Please choose another time and date.”

Start times less than 60 minutes apart in either direction are rejected. Exactly 60 minutes apart is allowed. Pending, Cancelled, Completed and Rescheduled records do not reserve slots under the requested Approved-only rule. Multiple pending requests can therefore use the same slot; approving one blocks approval of conflicting requests. Existing records are not rewritten.

The backend takes a MySQL named lock on the acquired connection before beginning each appointment write transaction. This serializes availability checks and updates across app instances using the same database. The lock is released after commit or rollback. A lock timeout returns HTTP 503 with a retry message. Direct SQL edits and old app instances bypass these rules: run all appointment-writing instances with the updated controller/service.

The admin management list shows only Pending, Rescheduled and Approved records and puts upcoming start times first. The patient appointment list retains all statuses and puts upcoming start times first. Within upcoming and historical groups, dates and times sort ascending. An appointment is upcoming when its clinic start timestamp is at or after the current Philippine time; today’s already-past start times belong below upcoming entries. Historical records remain visible where their status is included.

## Verification

44 automated tests passed, including duplicate messages, both sides of the one-hour buffer, inclusive hours, Sunday rejection, public/portal rejection without inserts or emails, approval/reschedule checks, simulated concurrent approvals, lock cleanup, and frontend sorting. Frontend build and lint passed. Database and concurrency tests use mocks; a live Aiven/Laragon end-to-end test was not available.

After installing, test with fictional appointments: approve an 11:00 AM booking on a future Monday–Saturday date; 11:00 AM must show the exact duplicate warning, 10:30 AM and 11:30 AM must be rejected, while 10:00 AM and noon must be allowed. Test Sunday, 09:59, 18:01, public and portal bookings, and admin rescheduling. Review historical appointments before attempting approval if they fall outside the new hours.

## Upcoming-first and quiet refresh update

If you already installed the appointment rules, copy the files listed below into your existing project. Keep your environment files, uploads and front-end/vite.config.js (including Cloudflare allowedHosts). No dependencies or database migrations are added. Restart both servers, or redeploy the backend and rebuild the frontend on Render.

- back-end/controllers/appointmentController.js
- front-end/src/utils/appointmentSchedule.js
- front-end/src/utils/useAutoRefresh.js
- front-end/src/components/AdminNotification.jsx
- front-end/src/components/AdminAccountsSection.jsx
- front-end/src/components/AppointmentCalendar.jsx
- front-end/src/components/PatientTable.jsx
- front-end/src/pages/admin/Reviews.jsx
- front-end/src/pages/admin/AdminAccounts.jsx
- front-end/src/pages/admin/Report.jsx
- front-end/src/pages/admin/QueueMngmt.jsx
- front-end/src/pages/admin/AppointmentMngmt.jsx
- front-end/src/pages/admin/PatientMngmt.jsx
- front-end/src/pages/admin/Payment.jsx
- front-end/src/pages/patient/MyAppointment.jsx
- front-end/src/pages/patient/PatientNotification.jsx
- front-end/src/pages/patient/Payment.jsx
- front-end/src/pages/patient/TreatmentHistory.jsx
- front-end/src/pages/patient/PatientDashboard.jsx

The shared refresh hook now passes { background: true } to page loaders. Background reloads retain mounted content instead of temporarily replacing it with loading screens, and transient failures retain the previous data. It no longer issues forced window scroll commands. Initial loading indicators and explicit user-initiated loading/error feedback remain available. Filters, pagination and modal state are not reset by the background refresh.

New refresh regression tests live in back-end/tests/autoRefresh.test.js; upcoming ordering tests are in back-end/tests/appointmentSchedule.test.js. Tests use mocked React effects, actual page-loader functions and mocked API/database responses. No live browser or database test was available. To check your deployment, scroll down in appointments, reports, queue and patient lists; wait 30 seconds and switch away/back. The page should keep content and scroll during the reload. Actual removal of enough records to shorten a page can still cause the browser to clamp scroll to its new maximum.
