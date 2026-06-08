# Changelog

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
