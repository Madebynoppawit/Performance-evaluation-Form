# Changelog

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
