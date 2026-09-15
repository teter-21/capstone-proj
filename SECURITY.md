# Security Notes

## Before running the system

1. Copy `back-end/.env.example` to `back-end/.env`.
2. Set a strong, private `JWT_SECRET` with at least 32 characters.
3. Set the real MySQL and email credentials in `.env`.
4. Run `database/security_migration.sql` if `users.is_main_admin` is not yet present.

## Main protections in this phase

- JWT authentication with current-account verification.
- Server-side admin and patient role checks.
- Main-admin-only administrator account creation.
- Patient-only routes are protected by the patient middleware.
- Login and password-reset rate limits.
- Public appointment request rate limit.
- Request body size limits.
- Security response headers.
- Restricted CORS origins.
- Safer image upload extension/MIME checks and a 2 MB limit.
- Generic login errors to reduce account enumeration.
- Secrets are not included in the project package.

This is application-level hardening for the capstone. Production deployment should also use HTTPS, a protected database, strong hosting credentials, backups, and regular dependency updates.
