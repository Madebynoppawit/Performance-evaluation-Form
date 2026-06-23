# Changelog

## v1.4.6 - 2026-06-23

Self-hosted fonts, broader automated test coverage, and a leaner settings surface.

### Fixed
- Cycles: `PATCH /cycles/:id/status` and `DELETE /cycles/:id` were open to all supervisory roles, so any manager could close (locking evaluations org-wide) or delete a cycle. Restricted both to admin/developer; creation stays open to supervisory roles. (Surfaced by the integration RBAC suite.)

### Performance / Privacy
- Self-host Inter, Noto Sans Thai, and JetBrains Mono (latin/latin-ext/thai woff2 subsets) and drop the Google Fonts CDN `@import`/links — works offline and behind restrictive networks, removes a third-party call on every load, and trims first paint.

### Testing
- Added a QA Robot `network` suite that asserts every `/api/*` response is 2xx and flags console/page errors and failed external resource requests.
- Wired up frontend component testing (`@testing-library/react` + jsdom) with a first `<Toggle>` test; added backend unit tests for `generateTempPassword`.

### Cleanup
- Removed non-functional Settings/Account controls (preferences that were stored but never read) and pruned the now-orphaned `set.*`/`acc.*` translation keys.

## v1.4.5 - 2026-06-23

Calibration fix, demo-ready password reset, security hardening, and a leaner settings surface.

### Fixed
- Calibration: admins/HR could never save a final grade — the dropdown posted to an endpoint that requires `edit`, which the access policy denies to admins, so every save returned 403. Added a dedicated `calibrate` permission and `PATCH /evaluations/:id/grade` endpoint so admins can set the calibrated grade while still being blocked from editing evaluation content.

### Product
- Forgot password now works for demo accounts: seed accounts get an employee number and date of birth so the identity-based reset can verify them.
- Login: added a Developer demo-account chip and a balanced 2×2 demo grid.
- Settings: the language control now switches the whole app live (was a dead preference); default-workspace preference now redirects after login; Guidelines follows the app-wide locale.
- Settings/Account: removed non-functional controls (notification/privacy toggles that were never read, decorative notification + activity panels), keeping only controls with real effect.

### Security
- Rotated the shared demo password and removed demo credentials from the README and API docs (they now point to the seed script).

### Docs
- README refreshed with GitHub-rendered Mermaid diagrams (architecture, evaluation lifecycle, RBAC, scoring model).

### Verification
- Functional write-flow audit: 28/28 endpoints; QA Robot 136/136; backend tests 35/35; frontend/backend `tsc` and production build clean.

## v1.4.4 - 2026-06-19

Calibration workspace completion, toast notifications, and login polish on top of the v1.4.3 security release.

### Product
- Calibration: the Final Grade dropdown now persists via `PATCH /evaluations/:id/summary`, locks on reviewed/closed rows, and surfaces success/error toasts.
- Calibration: full i18n (en/th/fr) for table headers, band/grade/status labels, and empty states (24 new `cal.*` keys).
- Mounted the previously-unwired `ToastProvider`, enabling toast notifications app-wide (fixes a blank-screen crash on the Calibration page).
- Login page: premium hero stat tiles and demo cards; fixed theme-toggle overlap on mobile.

### Platform
- Added `backend/scripts/deploy-v1.4.3.sh` — guarded one-shot deploy (migrate + per-user temp-password reissue) that refuses to run against a localhost database.

### Verification
- QA Robot full suite: 136/136 passed, 0 bugs across 13 suites and desktop/tablet/mobile viewports.
- Frontend/backend `tsc` clean; production build clean; backend unit tests 34/34.

## v0.2.0-rc.1 - 2026-06-08

Release candidate for requirement-aligned trial usage, with Standard and AI Preview deployment flavors.

### Product
- Merged the annual performance evaluation requirement into the form readiness flow.
- Added position-specific competency readiness checks before submission.
- Added admin add/delete controls for evaluations.
- Added premium CSV/PDF export actions and polished export behavior.
- Added English and French language support scaffolding alongside Thai.

### API & Platform
- Added Swagger UI at `/api/docs/` and OpenAPI JSON at `/api/openapi.json`.
- Added release flavor metadata to health endpoints and OpenAPI.
- Added `standard` and `ai-preview` release channels through backend/frontend env config.
- Default deployment remains no-AI; AI Preview can be enabled independently for trial builds.

### Release Flavors
- Standard: `APP_RELEASE_CHANNEL=standard`, `ENABLE_AI_FEATURES=false`, `VITE_RELEASE_CHANNEL=standard`, `VITE_ENABLE_AI_FEATURES=false`.
- AI Preview: `APP_RELEASE_CHANNEL=ai-preview`, `ENABLE_AI_FEATURES=true`, `AI_PROVIDER=openai|azure-openai`, `VITE_RELEASE_CHANNEL=ai-preview`, `VITE_ENABLE_AI_FEATURES=true`.

### Verification
- Target verification: lint, unit tests, E2E tests, production build, and high-severity audit.

## v0.1.0 - 2026-06-05

Initial CEO-ready product release for the AMW Performance Evaluation System.
