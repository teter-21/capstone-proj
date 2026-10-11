# Render UI alert and CSS cleanup

This update is based on the ZIP you attached on October 12, 2026. It preserves your Render/Aiven/Cloudinary settings, favicon, business rules and existing clinic records. No database migration or reset is required for this UI update.

## Install and deploy

1. Back up your current project or commit it to Git first.
2. Copy the updated `front-end/src` files and `back-end/tests/nativeAlerts.test.js` from this package into your Render project, replacing matching files. Keep your private environment files, certificate, image storage and existing Git checkout.
3. If copying into an existing folder, delete these three obsolete files (a ZIP overlay cannot delete old files):
   - `front-end/src/css/AddVisitModal.css`
   - `front-end/src/css/Home.css`
   - `front-end/src/css/Profile.css`
   None has an active CSS import. The old AddVisitModal source is commented out and its historical CSS path is not an active dependency.
4. From the project root run `npm test`. From `front-end` run `npm ci`, `npm run lint` and `npm run build`. Your frontend build needs its existing `VITE_API_URL` HTTPS backend setting.
5. Commit the updated files and stylesheet deletions, push to your GitHub repository, and redeploy the Render frontend. The backend application code is unchanged; the new file under backend tests only validates frontend handlers.
6. Refresh the website with Ctrl+Shift+R. Test admin account creation, incorrect/mismatched passwords, profile saving, password reset, booking, and foreground API errors. Check desktop/mobile layouts and status badges after deployment.

## Changes

- Removed 28 inline feedback containers. Validation, API failures, and success messages now call native `window.alert()` directly in their handlers rather than storing message strings for a later React banner. Existing bare `alert()` calls in active source are explicitly `window.alert()`.
- The same success message can appear on consecutive submissions. Success popups occur before form resets and password-reset redirects. The old reset-success redirect delay was removed: redirect happens when the user dismisses the popup.
- Session expiry/password-change interceptors mark their alerts as handled, avoiding duplicate popups from local request handlers. Settings/profile handlers stop follow-up work when the password-change response ends the session.
- Boolean load-failure flags still prevent failed requests from being presented as successful empty lists. Loading placeholders, empty states, appointment status badges, persisted clinic notifications, and confirmation dialogs remain part of the actual workflow. Dashboard/profile recovery buttons remain available after initial failures.
- Existing silent background refresh continues to preserve mounted content and scroll. Initial/manual request failures alert; background refresh failures remain quiet as before.
- Scanned all 43 source stylesheets. Removed three unimported stylesheets, 312 unused selector branches, and 32 shadowed/redundant or invalid declarations. Removed obsolete banner/error styling and duplicate page-level resets that were already provided globally.
- Scoped 46 colliding selector branches for name rows, appointment statuses/actions, avatars and treatment cards using `:where(page-root)` so styles cannot leak between the relevant pages without adding specificity.
- Retained intentional responsive overrides, pseudo-states, reduced-motion styles, used animations, dynamic status classes and third-party chart/carousel styles. Shared classes and CSS variables were preserved conservatively when runtime usage was uncertain. This is a static source cleanup, not proof that every remaining selector is exercised in every workflow.

## Validation

63 tests passed, including five new tests exercising the actual admin/reset handlers and session interceptors. Frontend lint and production build passed; backend JavaScript syntax checks passed. `UI_CLEANUP_REPORT.json` lists the CSS removals and scope changes.

The environment did not have an installed browser and its Chromium download failed, so visual browser regression testing could not be completed. Test the listed pages on desktop/mobile after deployment. No live Render, Aiven, Cloudinary or email requests were made.

This ZIP excludes dependencies, build output, Git history, secrets, certificates and patient uploads. Keep your existing private configuration and storage.
