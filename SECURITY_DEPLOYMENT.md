# Render security update — 2026-10-10

This update is for the Render frontend/backend with Aiven MySQL and Cloudinary. It retains the appointment rules, active appointment list, calendar and background refresh behavior. It is a code hardening update, not a guarantee against every attack.

## What changed

- JWTs use HS256 with an explicit issuer/audience, a random session identifier, a password-bound signature and a 30-minute expiration. Every authenticated request checks the server session and current user permissions.
- Logout deletes the server session. Password changes invalidate every older password-bound token; password resets also remove all server sessions for that account.
- Login tokens exist only in JavaScript memory. No token is written to localStorage, sessionStorage, cookies or image URLs. Existing stored tokens are cleared. Full reloads, new tabs and browser restarts require a new login; normal navigation and automatic background refresh do not.
- Existing weak passwords are accepted only for a restricted password-upgrade session. Other clinic data is blocked until a stronger password is set. Accounts are not deleted and their passwords are not silently replaced.
- New/changed passwords require 12 characters, reject obvious predictable choices and reject more than 72 UTF-8 bytes to avoid bcrypt truncation. Current password is required for email changes as well as password changes.
- Login, reset, booking and upload request limits persist in Aiven and survive restarts. Counters use hashed keys and row locks. Limiter/database failures fail closed. The existing five-failed-login limiter remains an additional defense.
- New patient photos are re-encoded to JPEG, stripped of metadata, bounded by byte/pixel limits, and uploaded as authenticated Cloudinary assets. Image responses require an admin or the matching patient account. Signed Cloudinary download URLs stay on the backend. Public /uploads serving is removed.
- API responses no longer reveal original patient image storage URLs. The frontend retrieves authorized images as blobs and releases them after use.
- Actual image content is decoded; fake extensions, HTML/SVG uploads and oversized images are rejected. Multipart fields and sizes are bounded.
- Browser password logging was removed. Password-reset emails retain HTML escaping; SMTP disables file/URL reads.
- Frontend production builds inject a CSP allowing only the app's own scripts, the configured HTTPS API, local/blob images and the existing Google Maps frame. Required inline React styles remain allowed. The API sends security headers and production HSTS.
- Patched dependency versions and lockfiles are included. Backend and frontend npm audits reported zero known vulnerabilities at verification time.

## Deploy in this order

1. Export a backup of the existing Aiven database. Preserve your current project, environment files, uploads, and local Aiven CA certificate outside this update archive. Do not overwrite real secrets with .env.example.
2. Extract the `finalcap` folder and copy its CONTENTS over your existing Render project. Keep root package.json/package-lock.json and front-end package.json/package-lock.json together. This archive deliberately excludes node_modules, generated dist, uploaded patient files, real environment values and CA certificates.
3. Temporarily suspend the old Render backend and stop any other process writing to the same database. Deploying the frontend and backend together avoids an incompatible older client.
4. Install the root dependencies from the extracted project root:
   ```powershell
   npm ci
   ```
   Install the frontend dependencies separately:
   ```powershell
   cd front-end
   npm ci
   cd ..
   ```
5. Run the migration BEFORE starting the updated backend. Two alternatives:
   - Using HeidiSQL connected to Aiven, select the database matching Render DB_NAME, and run the entire `database/migrations/20261010_security.sql`. This adds two security tables without resetting clinic data. The earlier `20261009_deployment.sql` support tables must already exist.
   - Or run `npm run migrate:deploy` from the project root with your existing local .env pointing to Aiven. For this local command, DB_SSL_CA_PATH must be the actual Windows CA file path, not `/etc/secrets/aiven-ca.pem`. The script runs both migrations and existing index checks. It does not load mock data or replace passwords.
   Stop on errors, correct the reported issue and rerun the additive migration. MySQL DDL can apply partially.
6. Secure existing patient photos BEFORE relying on image privacy:
   ```powershell
   npm run secure:images
   npm run secure:images -- --apply
   ```
   The first command lists needed changes without writing. The second converts referenced public Cloudinary images to authenticated delivery and requests CDN invalidation. It uploads locally available legacy images privately. It preserves patient records and reports failures by patient ID. If a migration fails after Cloudinary changes an asset, rerunning can recover the same public ID. Keep image updates stopped until it finishes successfully. Run with the existing Cloudinary credentials and Aiven CA settings in your local environment.
   The script cannot recover a legacy file that was already lost from Render's ephemeral filesystem. Missing/unsupported images are reported and remain unavailable; restore the file or upload a replacement through the new system. Old public Cloudinary photos are withheld by the new API until migrated. Previously downloaded copies cannot be recalled; CDN invalidation can take time. Only referenced images are covered: check any orphaned historical copies/backups separately in Cloudinary.
7. Confirm backend Render environment settings: NODE_ENV=production, existing DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, verified Aiven CA, existing Cloudinary values, FRONTEND_URL equal to the frontend HTTPS origin, and the existing Brevo configuration. PORT belongs to Render, not MySQL. Do not add secret values to VITE_ variables.
   JWT_SECRET must be random, at least 32 characters, and not a placeholder. Generate a new value if needed:
   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   Rotating it logs everyone out. Keep it exclusively in backend environment settings.
8. Confirm frontend Render VITE_API_URL is the actual backend HTTPS URL. Production builds now stop if it is missing or not HTTPS. For a static site with root directory `front-end`, use build command `npm ci && npm run build` and publish directory `dist`. Keep the existing SPA rewrite to `/index.html`.
9. For the backend, use build command `npm ci` and your existing start layout: `node server.js` if Root Directory is `back-end`, or `npm start` if it is the project root. Keep the CA Secret File named aiven-ca.pem and DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem on Render. Never commit the real .env or private keys.
10. Configure these frontend static-site HTTP headers for path `/*` in Render:
    | Header | Value |
    |---|---|
    | X-Frame-Options | DENY |
    | X-Content-Type-Options | nosniff |
    | Referrer-Policy | no-referrer |
    | Permissions-Policy | camera=(), microphone=(), geolocation=() |
    | Strict-Transport-Security | max-age=31536000 |
    | Content-Security-Policy | frame-ancestors 'none' |
    The CSP in the built HTML protects scripts/connections. `frame-ancestors` additionally requires a response header and is not enforced from a meta tag. Render headers reference: https://render.com/docs/static-site-headers
11. Push both frontend and backend changes plus lockfiles, then deploy/resume both services. Configure backend health check `/health/ready`; it requires email_outbox, auth_sessions and security_rate_limits to exist. All older JWTs are rejected by this release.
12. Sign in. A weak-password account opens Settings/Profile and must update its password before using clinic data. Sign in again after changing it.

## Proxy and database access

Persistent IP limits use Express req.ip. Keep a verified TRUST_PROXY_HOPS value for your actual Render ingress chain; do not use trust proxy=true or trust client-supplied IP headers blindly. Without a verified hop count, the conservative default uses the socket peer and can group users behind the same proxy. Verify this before wider traffic; request limits can otherwise affect multiple users together. Express reference: https://expressjs.com/en/guide/behind-proxies/

Use a dedicated runtime database account with only required permissions for the app's tables. Keep migrations/image maintenance on a separate account with the necessary DDL privileges. Changing Aiven users/grants requires the account owner's configuration; it is not performed by this archive. The current startup review-table check still needs its existing permissions until the table is provisioned.

## Verification before reopening

- Confirm `/health/ready` responds successfully after migrations.
- Sign in as an admin and a patient with separate accounts. Patient access to admin routes must return 403; another patient's image must return 404; anonymous image requests must return 401.
- Add and update a patient with a real small image. Check the thumbnail/modal and patient profile. A text file renamed to .jpg must be rejected. GET /uploads/<old filename> must return 404.
- Confirm public appointment rules, approval/rescheduling, notifications, reports and CSV export still work. Image migration does not alter appointment schedules.
- Verify logout invalidates a previously captured token. Changing/resetting a password must reject earlier tokens in every session.
- Check your frontend in a real browser for CSP errors and verify Google Maps still works. Full reload/new tab intentionally requires login.
- Recheck npm audit regularly. Zero known dependency findings does not establish that the whole app is vulnerability-free.

## Checks completed for this package

**58 automated tests passed; 51 backend JavaScript files passed syntax checks; frontend build/lint and lockfile install validation passed.** Automated tests cover appointment rules, transactional workflows, background refresh, authenticated sessions, logout replay rejection, password changes, weak-password restrictions, image ownership/content validation, persistent counters, and memory-only browser tokens. Production build and lint passed. Database/Cloudinary behavior is tested with controlled mocks; no live Aiven migration, Cloudinary conversion, Render deployment or real-browser end-to-end test was performed here.

Further production work includes operational backup/restore testing, a clinic change audit trail, monitoring/alerts, verification of runtime database grants and proxy boundaries, and a separate end-to-end security assessment. This update does not claim certification or legal compliance.
