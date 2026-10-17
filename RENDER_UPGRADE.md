# Render upgrade: roles, treatments and billing

## What changed

- Backend permission checks and response filtering now enforce staff roles.
- Main Admin assigns staff roles in Settings → Admin Accounts. A role change ends that staff member's sessions.
- Public, patient, staff and walk-in forms support multiple treatments.
- Appointment conflict checks reserve the combined duration of approved treatments.
- Completing treatment creates one draft invoice; Billing prices all procedures together.
- Senior/PWD eligibility previews one 20% discount. Saving requires ID verification or a denial reason.
- Invoice changes retain an actor, timestamp, eligibility snapshot and prior amounts.
- Treatment completion and invoice changes use database transactions.
- Unused placeholder pages and commented-out modal code were removed; block comments were shortened.

## Roles

| Action | Main Admin | Admin | Dentist | Front Desk |
|---|---|---|---|---|
| View patient demographics and schedule | Yes | Yes | Yes | Yes |
| Register/edit demographics; create patient login | Yes | Yes | No | Yes |
| Approve/reschedule appointments | Yes | Yes | No | Yes |
| Check in and manage waiting queue | Yes | Yes | Yes | Yes |
| Start/complete treatment; dental chart and clinical history | Yes | Yes | Yes | No |
| Prepare invoices, verify/deny discount, collect payment | Yes | Yes | No | Yes |
| Financial reports and revenue dashboard | Yes | Yes | No | No |
| Review moderation | Yes | Yes | No | No |
| Create/delete staff and assign roles | Yes | No | No | No |

Patients retain access only to their own records. Front Desk can see procedure names needed for scheduling and billing, but cannot retrieve clinical complaints, findings or treatment notes. Dentist responses omit financial amounts. Unknown staff roles receive no permissions.

**Existing non-main staff accounts become Front Desk on the first migration.** Sign in as Main Admin and assign Dentist/Admin where appropriate. Existing main-admin flags and passwords are retained.

## Before deployment

1. Export a backup of the existing Aiven `defaultdb`, including table structure and data. Keep the current code release available for rollback.
2. Test this release against a separate MySQL 8 database restored from that backup. Do not run seed/reset/mock-database scripts.
3. Confirm the clinic's treatment durations in `back-end/config/treatments.json`. Each procedure initially keeps the previous 60-minute default; these are scheduling estimates, not clinical recommendations.
4. Arrange a short maintenance window. Stop booking, treatment and billing writes while migrating and replacing the application. Do not run old and new backend versions simultaneously.

## Install and migrate from Windows PowerShell

Extract the ZIP into a separate folder first. Copy the project contents into your deployment repository, retaining your own `.env`, certificates and Git history. Remove the obsolete source files listed in `UPGRADE_CHANGES.json` if copying over an existing folder.

From the project root:

```powershell
npm ci
npm --prefix front-end ci
npm test
```

For the migration, use the existing Aiven connection values in the root `.env`:

```text
DB_NAME=defaultdb
DB_HOST=<your existing Aiven hostname>
DB_PORT=<your existing Aiven MySQL port>
DB_USER=<your existing Aiven username>
DB_PASSWORD=<your existing password>
DB_SSL_CA_PATH=C:/Users/Lester/path/to/aiven-ca.pem
```

Use the actual certificate location on your laptop. Do not use `/etc/secrets/...` when running on Windows. Do not configure both CA variables.

Then run:

```powershell
npm run migrate:deploy
```

Wait for `Deployment migration complete. Existing clinic records retained.` The migration adds columns and audit tables and widens procedure-name columns. It does not drop tables, delete records or reset passwords. MySQL DDL commits separately; if migration fails, fix the reported error and rerun it before starting the new backend.

Test the frontend build with your actual Render backend origin:

```powershell
$env:VITE_API_URL="https://YOUR-BACKEND.onrender.com"
npm --prefix front-end run build
```

## Deploy to Render

1. Review the code changes, commit and push to your connected repository.
2. Keep your existing Render build/start commands and service root directories. The root start command remains `npm start`; a service rooted in `back-end` can continue using `node server.js`.
3. Keep the existing secrets, Brevo, Cloudinary, JWT and CORS settings. No new environment variables are required.
4. On Render, keep `DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem` and the matching Secret File. Keep `DB_PORT` separate from Render's HTTP `PORT`.
5. Deploy the backend after migration succeeds. Check `/health/ready` returns `{"status":"ready"}`.
6. Deploy the frontend with the correct `VITE_API_URL`. Keep its SPA rewrite to `/index.html`.
7. Sign in as Main Admin, assign existing staff roles, then reopen the system after the checks below.

## New workflow

1. Front Desk enters the patient's verified birthdate and PWD registration under Add/Edit Patient. Historical age-only records remain unchanged; age alone does not trigger the senior discount.
2. Select one or more procedures while booking. The server calculates duration from the catalog; client-supplied durations are ignored.
3. A Dentist/Admin starts treatment and records the performed procedures and clinical notes. Completing treatment creates a draft invoice with no payment recorded.
4. Front Desk opens Billing → Prepare invoice and enters each procedure's charge.
5. The system assesses age on the visit date and PWD registration. A patient eligible under both receives one 20% discount, not 40%.
6. Verify valid identification and eligibility before applying the discount. If proof is not provided, select **Remove / deny the 20% discount** and enter the reason.
7. Save the invoice, then select Record Payment. The backend computes balances and rejects overpayment or an outdated invoice version.
8. Before the first payment, View invoice allows a corrected price or discount decision. After any payment, the invoice is read-only; refunds and credit notes are outside this release.

Historical visits remain payable with their original totals and are marked `legacy`; they are not retrospectively discounted or repriced. New draft invoices are labelled awaiting preparation rather than fully paid. Patients can see consolidated invoice details in Treatment History.

## Scheduling rules

- Monday–Saturday; start times remain 10:00 AM–6:00 PM.
- A 6:00 PM one-hour visit still ends at 7:00 PM. Multiple procedures must start early enough to finish by 7:00 PM.
- Only Approved appointments reserve time. The entire combined interval is checked, including during approval and rescheduling.
- Adjacent intervals are allowed; overlapping intervals are rejected.
- Exact duplicate start times retain: “This time and date already has an appointment. Please choose another time and date.”
- Existing appointments retain a 60-minute duration. Future bookings snapshot catalog durations so later catalog edits do not silently change existing reservations.

## Verification before reopening

- Log in as each staff role and try both visible screens and restricted API paths.
- Confirm Front Desk cannot access dental charts, clinical history or report exports; Dentist cannot access Billing.
- Change a staff role and confirm their previous session is rejected.
- Book two procedures, approve them, and check overlap rejection and an exact end/start boundary.
- Complete treatment once; retrying must not create another visit.
- Price two procedures at ₱1,000 and ₱500: eligible total ₱1,200; denied/ineligible total ₱1,500.
- Test the day before and on a patient's 60th birthday, PWD-only eligibility, missing birthdate and denied ID.
- Confirm a denial appears in invoice audit history and a stale invoice cannot overwrite a newer one.
- Record a payment and verify the invoice balance, patient portal and reports.
- Confirm historic bills, private images, notifications and quiet auto-refresh still work.

## Limits and compliance

This release implements the requested 20% subtotal calculation, identification workflow and role separation. It does not certify compliance with privacy or tax law. The clinic still needs its own authorization reviews, retention policy, secure backups, incident procedures and staff training.

VAT exemption, promotional-discount comparisons, citizenship verification, statutory ID-number records, tax invoices and refunds are not automated. Have the clinic's accountant confirm the billing basis and required records before using this release for statutory discount reporting. Do not treat the generated visit invoice as a certified tax invoice.

Official reference: [NCDA — IRR of RA 10754](https://ncda.gov.ph/disability-laws/implementing-rules-and-regulations-irr/irr-of-ra-10754-an-act-expanding-the-benefits-and-privileges-of-persons-with-disability-pwd/), including proof of entitlement, no double discounts, VAT and recordkeeping provisions.

## Validation and rollback

Automated tests cover permission enforcement, response filtering, scheduling, invoice calculations, rollback, stale writes, image privacy and existing email/session behavior. The production frontend builds with a placeholder HTTPS API origin for validation; deploy with your real URL.

No live Aiven/Render/Cloudinary/Brevo services were changed or integration-tested. No browser end-to-end test or real MySQL migration was run in the preparation environment. Complete the staging and live smoke checks above.

If rollback is needed, stop writes first. Do not simply run the old backend against newly created draft invoices: it does not understand the new invoice workflow. Restore a matched database/code backup during maintenance, or prepare a forward fix; retain any post-upgrade records before restoring a backup.
