# Security update (2026-10-10)

Follow SECURITY_DEPLOYMENT.md first. Its session, image privacy and migration instructions supersede the earlier security notes below.

# Updated dental clinic app: Render + Aiven + Cloudinary + Brevo

Start here before replacing the running app. Updated source is ready, but your Render/Aiven settings and a verified email sender are required. No live deployment or live email delivery was performed during this repair.

## 1. Free appointment email

The app now uses the **Brevo HTTPS API** by default. Brevo currently advertises **300 free emails per day**, shared between transactional and marketing messages. Free-tier availability, sender/account approval, and inbox acceptance are controlled by Brevo; confirm your account allowance before use.

1. Create a free account at https://www.brevo.com/.
2. In **Settings → Senders, Domains, IPs → Senders**, add a sender named **Magno Dental Clinic** with your clinic email. Complete the verification sent to that inbox. If Brevo asks you to activate/approve transactional sending, complete that process too.
3. Generate an **API key** in your account's SMTP/API settings. Use an API key, not the SMTP key/password.
4. On your Render **backend service**, add:

| Variable | Value |
|---|---|
| `EMAIL_PROVIDER` | `brevo` |
| `BREVO_API_KEY` | Your Brevo API key |
| `EMAIL_FROM` | Your verified sender email |
| `EMAIL_FROM_NAME` | `Magno Dental Clinic` |
| `EMAIL_USER` | Your clinic Gmail address |
| `EMAIL_REPLY_TO` | Your clinic Gmail address |
| `EMAIL_TIMEOUT_MS` | `10000` |

`EMAIL_PASS` is not used by Brevo. You can remove it once SMTP is no longer needed. No Gmail app password is needed for the Brevo integration. Keep the API key in Render; do not add it to frontend variables or commit it to Git.

**Gmail distinction:** patients can receive notifications in Gmail, and replies go to your Gmail inbox. This integration does not send through your Gmail account or place messages in Gmail's Sent folder. Brevo may rewrite a sender using an unauthenticated/free domain to its own `brevosend.com` domain. You cannot authenticate `gmail.com` because you do not own it. For a stable branded From address, use and authenticate a domain you own. If your account does not permit your Gmail sender, use the verified sender Brevo supports and retain Gmail as `EMAIL_REPLY_TO`.

The `EMAIL_PROVIDER=smtp` option remains for local development or hosting that permits Gmail SMTP, with `EMAIL_USER`/`EMAIL_PASS` and bounded timeouts. Do not select it on Render Free: SMTP ports are blocked there.

## 2. Fix Aiven connection settings

Keep your working `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values. Add **`DB_PORT`**, using the exact MySQL port from Aiven's connection information. **`PORT` is only the Render HTTP port** and must not hold the Aiven port. Allow Render to provide it.

TLS certificate verification is now enabled. Download your service's CA certificate from Aiven, add it to Render as a Secret File named `aiven-ca.pem`, and set:

```text
DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem
```

For the local migration command, point this variable to the local CA file instead. Alternatively, `DB_SSL_CA` accepts the full PEM certificate (actual newlines or escaped `\n`). Use only one CA setting. Do not disable certificate verification to work around setup errors.

Set `NODE_ENV=production`. Keep `JWT_SECRET` at least 32 characters with a random value. Set `FRONTEND_URL` to the exact frontend HTTPS origin without a trailing slash. Keep all three existing Cloudinary variables.

Database connections now use a +08:00 session timezone for Philippine business dates. Existing DATE fields are not rewritten. MySQL TIMESTAMP display follows that session timezone; check historical timestamp displays during rollout.

## 3. Apply the additive migration before deploying

Back up the live Aiven database first. **Do not reimport `clinic_db_aiven_ready_FINAL.sql`: it drops the live tables.** The updated package includes an additive migration instead.

On your computer, from this package's root folder:

```bash
npm ci
```

Copy `.env.example` to `.env`, enter your actual Aiven values, and point `DB_SSL_CA_PATH` to your downloaded local CA file. Then run:

```bash
npm run migrate:deploy
```

This creates `email_outbox` and `queue_daily_sequence`, adds query indexes, normalizes account emails, and adds email uniqueness. It preserves patients, accounts, visits, appointments, and payments. It does not replace passwords or load mock patients. It stops if duplicate normalized emails exist; resolve duplicates explicitly, then rerun. DDL can partially apply, so inspect any error and rerun the idempotent script once corrected. Run during a quiet period so account creation does not race with email normalization/indexing.

The SQL file `database/migrations/20261009_deployment.sql` can also be executed in your SQL client to create the two tables. **That SQL file alone does not add the other indexes/email uniqueness**; use the migration command for the full update.

Existing pending appointments do not automatically gain a historical submission email; new bookings and future status changes use the queue. The updated booking routes require the outbox table. If migration is missing, booking fails and rolls back instead of saving a booking without its email record.

## 4. Deploy the backend and frontend

Replace the corresponding source files in your existing repository, keeping your own Git history. The package excludes `.git`, `node_modules`, built `dist`, and real environment files. Restore dependencies with `npm ci` rather than copying Windows modules to Render.

| Render service | Root directory | Build command | Start / publish |
|---|---|---|---|
| Backend Web Service | Repository root | `npm ci` | `npm start` (runs `node back-end/server.js`) |
| Frontend Static Site | `front-end` | `npm ci && npm run build` | Publish directory: `dist` |

The backend package is at repository root; there is no `back-end/package.json`. Use a supported Node 22 or 24 release. The package's engine range permits these major versions.

Set **`VITE_API_URL=https://your-backend.onrender.com`** on the frontend service, then rebuild it. Set a static-site rewrite from `/*` to `/index.html` for React Router deep links if you do not already have one. Never add DB, JWT, email API, or Cloudinary secrets as Vite variables.

Coordinate the new source and backend variable changes in one rollout. Render supports **Save only** for variables so you can apply them with the next code deploy. Use `/health/ready` as the backend health-check path. `/health/live` checks HTTP availability; readiness also checks database/outbox availability.

`TRUST_PROXY_HOPS` is optional. Set a known hop count only after verifying your actual proxy topology; the source does not blindly trust arbitrary `X-Forwarded-For` values.

## 5. Verify email end to end

1. On a machine with the new backend environment configured, run `node back-end/scripts/checkEmail.js`. This authenticates with Brevo without sending email; success does not verify the sender or inbox delivery.
2. Create a **new public appointment** using a real email you control. Do not use seeded `@example.test` addresses.
3. Booking responds promptly; email is queued and normally attempted on the worker's next pass (every 30 seconds while the backend is running).
4. Check Render logs for `Appointment email accepted`, and check Brevo's transactional logs plus the recipient inbox/spam folder. Accepted means provider accepted the message, not that the inbox received it.
5. Repeat from a logged-in patient's booking page. Ensure that account has a real recipient email.
6. Approve/cancel/reschedule the booking. Check both the patient's in-app notification and email. Test password reset separately; reset email is sent directly through Brevo with a bounded timeout.
7. Check migration/queue state in Aiven without exposing patient payloads:

```sql
SELECT id, appointment_id, event_type, status, attempts, message_id, last_error
FROM email_outbox ORDER BY id DESC LIMIT 20;
```

Queue states: `pending` waits for dispatch/retry; `processing` holds a timed lease; `accepted` has a provider acceptance ID; `failed` exhausted attempts or received a permanent rejection. Retryable failures get exponential delays, up to six attempts. Correct sender/key/quota issues before requeuing failed entries. Preserve pending payloads; accepted payloads are cleared to reduce retained patient information.

The queue is durable in Aiven and leases recover after a crash. It is **at least once**: a crash or timeout after provider acceptance but before database acknowledgment may produce a duplicate email. On Render Free the worker stops when the service sleeps; queued emails resume on wake. No extra paid worker is required, but prompt dispatch during idle periods is not guaranteed. Password reset links are direct sends and expire after one hour.

## What changed

- Brevo HTTPS email transport; SMTP retained only as an explicit option.
- Both booking routes save a submission-email job atomically with the appointment.
- Status/reschedule updates save email jobs and in-app notifications together, independently of delivery.
- Approval/patient creation runs in a transaction and no longer automatically merges people by a shared phone number.
- Payment recording uses one locked database connection, rollback, commit, and release.
- Password changes via reset and token consumption commit or roll back together.
- Aiven port separated from HTTP port; verified TLS; bounded pool queue; clinic timezone.
- Daily queue-number allocation is atomic, retaining existing queue records.
- Cloudinary/legacy image URL handling shared across patient views.
- Patient directory uses server pagination/filter/sort. Navbar search returns eight compact results instead of all patient records.
- Appointment calendar requests only the visible month.
- Background refresh runs every 30 seconds, skips hidden tabs, and avoids overlapping refreshes within each hook.
- Route pages load lazily; common layout CSS remains loaded for direct links.
- Two large PNGs replaced with compressed WebP versions.
- Report queries run concurrently with a consolidated summary. CSV exports stream all matching visits, not just the 200-row screen preview, and escape spreadsheet formula input.
- Frontend environment validation, request timeout, corrected expired-session redirect, readiness/liveness, shutdown handling, and cleaned lint errors/warnings.

## Verification and limits

All 20 regression checks passed; frontend lint passed with zero errors/warnings; production frontend build passed. Email HTTP/auth/error behavior and queue transitions were tested using mocks, not your live API key. Payment/booking/reset rollback behavior was tested through isolated connection mocks. The migration has not been executed against your live Aiven service, and actual certificate trust/delivery must be checked during rollout. Browser smoke testing could not run because Chromium is unavailable in this environment; inspect the patient directory, direct admin links, calendar, forms and image preview after deploying to staging.

Previous initial JS chunk: 973.62 KB (292.40 KB gzip). Split build initial JS chunk: 373.42 KB (122.84 KB gzip), with chart code loaded separately. The two large images shrank from 4,486 KB combined to about 232 KB. These are build-size improvements, not measured browser/API latency or a production load benchmark.

Remaining work for a production clinic: simultaneous queue calling/transition rules need additional concurrency handling; sessions are now revoked by password changes; report revenue still groups cumulative paid amounts by visit date rather than payment collection date; existing public Cloudinary URLs must be migrated using the privacy script; legacy image bytes must be migrated if no longer available. Confirm clinic opening hours/conflict rules and privacy requirements before introducing business rules not present in the original app.

## Official sources checked on 9 October 2026

- Brevo free API allowance: https://www.brevo.com/features/email-api/
- Brevo HTTPS send endpoint: https://developers.brevo.com/reference/send-transac-email
- Sender verification: https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email
- Sender-domain rewriting: https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-issues-with-domain-authentication-Brevo-code-DKIM-DMARC
- Render SMTP restriction and sleep behavior: https://render.com/docs/free
- Render variables and secret-file paths: https://render.com/docs/configure-environment-variables
