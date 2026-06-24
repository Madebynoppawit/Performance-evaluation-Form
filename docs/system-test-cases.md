# System Test Cases

This document is the end-to-end test case catalog for the AMW Performance
Evaluation System. Use it as the shared QA checklist for release testing,
manual UAT, and automated coverage planning.

## Test Strategy

| Layer | Command | Purpose |
|---|---|---|
| Backend unit | `npm run test -w backend` | Pure business logic, middleware helpers, OpenAPI generation, scoring, password utilities |
| Backend integration | `npm run test:integration:setup && npm run test:integration -w backend` | API behavior against migrated and seeded PostgreSQL |
| Frontend unit | `npm run test -w frontend` | Pure UI logic, scoring helpers, constants, access policy helpers |
| Frontend E2E | `npm run test:e2e -w frontend` | Browser workflows with mocked API responses |
| Full QA robot | `npm run qa` | Running application checks across auth, navigation, dashboard, forms, reports, RBAC, responsive viewports |
| Release gate | `npm run verify` | Lint, unit, E2E, build, and audit gate |

## Test Data

| Account | Role | Main Use |
|---|---|---|
| `developer@amw-ems.com` | Developer | Super-role, admin-level override, release validation |
| `admin@amw-ems.com` | Admin | User management, reports, calibration, destructive admin actions |
| `manager.eng@amw-ems.com` | Manager | Create evaluations, review team data, reports |
| `supervisor1@amw-ems.com` | Supervisor | Create and complete evaluations |
| `officer1@amw-ems.com` | Employee | Self profile, own evaluations, restricted access checks |

Passwords must come from the local seed configuration and must not be copied
into public documentation outside this repository.

## Entry And Exit Criteria

Entry:

- Test database is migrated and seeded.
- Frontend and backend build locally.
- Environment variables match `.env.example`, `.env.test`, or the target release profile.
- Browser dependencies for Playwright are installed.

Exit:

- All critical and high severity test cases pass.
- No unresolved P0/P1 bugs remain.
- All failed medium or low severity cases have an owner and release decision.
- `npm run verify` passes or an approved exception is recorded.

## Severity

| Severity | Definition |
|---|---|
| Critical | Blocks login, exposes sensitive data, breaks role isolation, corrupts evaluation data, or prevents release |
| High | Breaks a main workflow for a major role or causes incorrect scores/reports |
| Medium | Breaks a secondary workflow, validation, usability, or observability expectation |
| Low | Cosmetic or minor copy/formatting issue with no workflow impact |

## Authentication And Session

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| AUTH-001 | Login with valid company email | Open login, enter admin credentials, submit | User lands on dashboard with valid session | Critical | Backend integration, QA robot |
| AUTH-002 | Login with employee number | Enter seeded employee number and password | Login succeeds and user profile loads | High | Backend integration |
| AUTH-003 | Invalid password | Enter valid identifier with wrong password | API returns 401 and UI shows safe error | Critical | Backend integration, QA robot |
| AUTH-004 | Unknown identifier | Enter unknown email or employee number | API returns 401 without account discovery details | High | Backend integration |
| AUTH-005 | Empty login body | Submit empty request | API returns 400 validation error | Medium | Backend integration |
| AUTH-006 | Malformed token | Call protected route with fake token | API returns 401 | Critical | Backend integration |
| AUTH-007 | Expired token | Call protected route with expired JWT | API returns 401 and frontend signs user out | Critical | Backend integration |
| AUTH-008 | Session persistence | Refresh browser after login | User remains signed in until expiry | High | E2E |
| AUTH-009 | Session expiry warning | Keep session near expiry | Warning appears and logout path works | Medium | QA robot |
| AUTH-010 | Logout | Click logout | Session storage is cleared and protected pages redirect to login | High | QA robot |
| AUTH-011 | Forgot password mismatch | Submit employee number and wrong birth date | Reset is rejected with no token or sensitive details | High | Backend integration |
| AUTH-012 | Forgot password match | Submit matching employee number and birth date with strong new password | Password changes, must-change flag clears, login succeeds | Critical | Backend integration |
| AUTH-013 | Buddhist year birthday input | Reset imported user with Buddhist year date | Reset succeeds when date maps to source birthday | High | Backend integration |
| AUTH-014 | Weak password | Register or reset with weak password | API returns validation error | High | Backend unit/integration |
| AUTH-015 | Non-company email registration | Attempt registration with external domain | API rejects the request | High | Backend integration |

## Role And Access Control

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| RBAC-001 | Developer can access privileged surfaces | Sign in as developer and open users, reports, evaluations | All privileged routes load | Critical | Integration, QA robot |
| RBAC-002 | Admin can manage users | Sign in as admin and open user management | User table and admin actions are visible | Critical | Integration, QA robot |
| RBAC-003 | Manager cannot access admin user management | Sign in as manager and request `/api/users` | API returns 403 | Critical | Integration |
| RBAC-004 | Employee cannot access admin user management | Sign in as employee and request `/api/users` | API returns 403 | Critical | Integration |
| RBAC-005 | Employee cannot create evaluation | POST evaluation as employee | API returns 403 | Critical | Integration |
| RBAC-006 | Supervisor can create evaluation | POST evaluation as supervisor for existing employee | Evaluation is created as DRAFT | High | Integration |
| RBAC-007 | Admin cannot edit evaluator-owned form sections | Save goals or answers as admin | API returns 403 where `blockAdmin` applies | High | Integration |
| RBAC-008 | Non-participant cannot read evaluation | Supervisor opens unrelated evaluation | API returns 403 | Critical | Integration |
| RBAC-009 | Participant can read evaluation | Evaluator or evaluatee opens own evaluation | API returns 200 | Critical | Integration |
| RBAC-010 | Admin/developer can delete evaluation | Delete evaluation as admin or developer | API returns 204 and record is removed | High | Integration, E2E |
| RBAC-011 | Manager/employee cannot delete evaluation | Delete evaluation as non-admin | API returns 403 | Critical | Integration |
| RBAC-012 | Employee cannot change HR-owned profile fields | PATCH `/api/auth/me` with position or role | API returns 400 or 403 | Critical | Integration |
| RBAC-013 | Report access follows role policy | Request summary and audit reports across roles | Only authorized roles receive data | High | Integration, QA robot |

## Evaluation Workflow

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| EVAL-001 | Evaluation list loads | Open evaluations page as admin | List shows seeded and created evaluations | Critical | Integration, E2E |
| EVAL-002 | Employee scoped list | Open evaluations as employee | Only own evaluator/evaluatee records appear | Critical | Integration |
| EVAL-003 | Create evaluation for existing employee | Select cycle, evaluator, evaluatee, form type | New DRAFT evaluation appears | Critical | Integration, E2E |
| EVAL-004 | Create evaluation with new evaluatee as admin | Submit new evaluatee data | User and evaluation are created | High | Integration |
| EVAL-005 | Reject duplicate or invalid create | Submit duplicate or missing evaluatee payload | API returns 400 or 409 | High | Integration |
| EVAL-006 | Save draft answers | Fill rating/text answers and save | Status moves from DRAFT to IN_PROGRESS | Critical | Integration |
| EVAL-007 | Save goals | Add goal entries with weights and scores | Entries persist and reload correctly | Critical | Integration |
| EVAL-008 | Save competency scores | Enter all required competency scores | Scores persist and validation state updates | Critical | Integration, QA robot |
| EVAL-009 | Save attendance | Enter leave, late, and disciplinary values | Attendance score is calculated and saved | Critical | Integration |
| EVAL-010 | Save training section | Add training requirements or completed training | Data persists and contributes to readiness where applicable | Medium | QA robot/manual |
| EVAL-011 | Save comments | Add strengths, improvements, required skills | Comments persist and export includes them | Medium | QA robot/manual |
| EVAL-012 | Save salary summary | Manager/developer enters salary and bonus fields | Sensitive salary data persists only for allowed roles | Critical | Integration/manual |
| EVAL-013 | Submit complete evaluation | Complete required sections and submit | Status becomes SUBMITTED or PENDING_REVIEW | Critical | Integration |
| EVAL-014 | Block incomplete submit | Leave required sections incomplete and submit | UI/API blocks submit with clear missing section state | High | QA robot/manual |
| EVAL-015 | Two-stage reviewer submit | Submit evaluation with reviewer, then reviewer approves | Status moves PENDING_REVIEW to SUBMITTED | Critical | Integration |
| EVAL-016 | Non-reviewer cannot review | Call review endpoint as unrelated user | API returns 400 or 403 | Critical | Integration |
| EVAL-017 | Acknowledgement signing | Manager saves employee/evaluator/director sign-off dates | Dates persist and re-saving is idempotent | High | Integration |
| EVAL-018 | Delete evaluation | Delete as admin from UI | Row disappears and API returns 204 | High | Integration, E2E |
| EVAL-019 | Unknown evaluation | Request missing evaluation id | API returns 404 | Medium | Integration |
| EVAL-020 | Form type selection by position | Create evaluations for officer, supervisor, manager, director | Correct form definition and competencies load | High | Manual/QA robot |

## Scoring And Calibration

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| SCORE-001 | Empty score input | Calculate total from no rating answers | Returns null | High | Backend unit |
| SCORE-002 | Equal weighted average | Score two equal weighted ratings | Returns simple average | Critical | Backend unit |
| SCORE-003 | Weighted score | Score ratings with unequal weights | Returns weighted average | Critical | Backend unit |
| SCORE-004 | Null and text answers | Mix null/text answers with rating answers | Non-rating and null scores are ignored | High | Backend unit |
| SCORE-005 | Goal weight validation | Enter goal weights that do not total required amount | UI/API blocks submit or marks not ready | High | QA robot/manual |
| SCORE-006 | Configurable scoring weights | Change evaluation weights | Total score reflects goal, competency, attendance, and training weights | Critical | Unit/manual |
| SCORE-007 | GPA final grade | Submit evaluation with final total score | GPA-style grade equals configured final grade mapping | Critical | Unit/manual |
| SCORE-008 | Calibration page loads | Admin opens calibration workspace | Cycle scores and final grade controls load | High | QA robot/manual |
| SCORE-009 | Calibrate final grade | Admin changes final grade | Grade saves and appears in reports/export | High | Manual |
| SCORE-010 | Non-admin calibration blocked | Manager or employee attempts grade calibration | API/UI denies action | Critical | Integration/manual |

## Templates

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| TPL-001 | Template list | Open templates page | Existing templates render | High | Integration, E2E |
| TPL-002 | Create template | Click New Template and submit required fields | Template is created and detail page opens | High | E2E |
| TPL-003 | Edit template metadata | Change name, description, type | Changes persist | Medium | Manual |
| TPL-004 | Add section | Add section to template | Section appears in order | Medium | Manual |
| TPL-005 | Add question | Add rating/text question | Question appears with correct type and weight | Medium | Manual |
| TPL-006 | Delete template | Delete unused template as admin | Template is removed | Medium | E2E |
| TPL-007 | Delete protected template | Delete template used by active cycle | API rejects or safely handles dependency | High | Manual |
| TPL-008 | Role access to template builder | Open builder across roles | Only allowed supervisory/admin roles can mutate | High | QA robot/manual |

## Cycles

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| CYCLE-001 | Cycle list | Open cycles page across roles | Active cycles load | High | Integration, E2E |
| CYCLE-002 | Create cycle | Select template and valid dates | Cycle is created | High | E2E |
| CYCLE-003 | Invalid date range | End date before start date | Validation blocks save | High | Manual |
| CYCLE-004 | Status change | Admin changes cycle status | Status persists and affects available actions | High | Manual |
| CYCLE-005 | Delete cycle | Delete fixture cycle with no blocking data | API returns 204 | Medium | E2E/manual |
| CYCLE-006 | Delete cycle with evaluations | Delete cycle that owns evaluations | API rejects or cascades only by approved policy | High | Manual |

## Reports And Export

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| REP-001 | Summary report | Open reports page as admin | Cycle summary and department breakdown load | Critical | Integration, E2E |
| REP-002 | Dashboard report stats | Open dashboard | Total, completed, pending, average score, users, active cycles show | High | E2E |
| REP-003 | CSV export | Export evaluation CSV | Download filename and CSV content are correct | High | E2E |
| REP-004 | PDF export English | Export evaluation PDF in English | PDF downloads with correct filename and content | High | E2E/manual |
| REP-005 | PDF export French | Export evaluation PDF in French | PDF downloads with French filename/content | High | E2E/manual |
| REP-006 | Thai PDF font | Export Thai content | Thai glyphs render without tofu or garbling | High | Manual |
| REP-007 | Salary export boundary | Export as employee | Salary fields are omitted or denied | Critical | Manual |
| REP-008 | Audit events report | Open audit report as admin | Login/export/mutation events appear with request id | Critical | E2E |
| REP-009 | Export audit trail | Export a report and inspect audit records | Export event is persisted with actor and target | Critical | Integration/manual |

## User And Data Management

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| USER-001 | User list | Admin opens users page | User table loads without password hashes | Critical | Integration, QA robot |
| USER-002 | Create user | Admin creates user with valid company email | User is created with temporary password policy | Critical | Manual |
| USER-003 | Duplicate user | Create existing email or employee number | API returns conflict | High | Manual |
| USER-004 | Update user profile | Admin edits department, position, role | Changes persist and access policy updates | High | Manual |
| USER-005 | Disable/delete user | Admin disables or deletes eligible user | User can no longer access as intended | High | Manual |
| USER-006 | Self profile update | Employee updates own editable fields | Allowed fields persist | Medium | Manual |
| USER-007 | Employee import | Import employee CSV/source data | Valid rows create/update users and invalid rows are reported | High | QA robot/manual |
| USER-008 | Temporary password reissue | Run reissue script for target users | New temporary passwords are generated and must-change flag is set | High | Manual |

## Localization And UI

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| UI-001 | Thai locale | Switch to Thai and navigate major pages | Labels render in Thai and layout remains stable | Medium | QA robot/manual |
| UI-002 | English locale | Switch to English | Labels render in English | Medium | E2E |
| UI-003 | French locale | Switch to French | Labels render in French and exports offer French PDF | Medium | E2E/manual |
| UI-004 | Theme switch | Toggle light/dark mode | Theme persists after refresh | Low | QA robot/manual |
| UI-005 | Command palette | Press Ctrl+K and search Swagger | Admin command appears and can be selected | Medium | E2E |
| UI-006 | Toast feedback | Complete create/delete/save actions | Success/error toast appears and disappears correctly | Low | Manual |
| UI-007 | Error boundary | Trigger recoverable frontend error | Error boundary displays safe fallback | Medium | Manual |
| UI-008 | Empty states | View pages with no data | Empty state is clear and action buttons are appropriate | Low | Manual |

## Responsive And Accessibility

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| A11Y-001 | Dashboard no critical violations | Run axe on dashboard | No critical accessibility violations | High | E2E |
| A11Y-002 | Reports no critical violations | Run axe on reports | No critical accessibility violations | High | E2E |
| A11Y-003 | Keyboard navigation | Navigate login, command palette, forms, modals with keyboard | Focus order is logical and visible | High | Manual |
| A11Y-004 | Modal focus trap | Open create/delete dialogs | Focus stays inside modal and Escape/close works | Medium | Manual |
| A11Y-005 | Desktop viewport | Run key flows at 1440x900 | No horizontal overflow or clipped controls | High | E2E, QA robot |
| A11Y-006 | Tablet viewport | Run key flows at 768x1024 | Navigation, tables, dialogs remain usable | High | QA robot |
| A11Y-007 | Mobile viewport | Run key flows at 390x844 | No overlapping controls or unusable modals | High | QA robot |
| A11Y-008 | Long text | Enter long names/departments/comments | Text wraps or truncates without layout breakage | Medium | Manual |

## API, Observability, And Operations

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| OPS-001 | Liveness | GET `/health` | 200 with version, env, release, request id | Critical | Integration |
| OPS-002 | Readiness healthy | GET `/api/ready` with DB up | 200 with database `ok` | Critical | Integration/manual |
| OPS-003 | Readiness degraded | Stop DB and request readiness | 503 with database `degraded` | Critical | Manual |
| OPS-004 | Metrics public/no token mode | GET `/metrics` in local config | Prometheus text response returns | Medium | Manual |
| OPS-005 | Metrics token guard | Set `METRICS_TOKEN` and call without token | 401; valid Bearer token succeeds | High | Manual |
| OPS-006 | Request id propagation | Send request with/without request id | Response and logs include request id | High | Unit/integration |
| OPS-007 | No-store API headers | Call protected API route | Cache-Control includes no-store | High | Integration |
| OPS-008 | Helmet headers | Call API and inspect headers | Security headers are present and X-Powered-By absent | High | Integration |
| OPS-009 | Swagger UI | Open `/api/docs/` | Swagger UI renders | Medium | Manual |
| OPS-010 | OpenAPI JSON | GET `/api/openapi.json` | Valid OpenAPI document returns | High | Backend unit/manual |
| OPS-011 | Docker compose demo | Start demo compose | Frontend, backend, migration, and database become healthy | High | Manual |
| OPS-012 | Production compose | Start production compose with `.env.prod` | Migration runs once and app serves through nginx | Critical | Manual |

## Security And Abuse

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| SEC-001 | IDOR read prevention | Employee requests unrelated evaluation id | API returns 403 | Critical | Integration |
| SEC-002 | IDOR delete prevention | Employee deletes unrelated evaluation | API returns 403 | Critical | Integration |
| SEC-003 | JWT signature tamper | Alter valid token signature | API returns 401 | Critical | Integration |
| SEC-004 | JWT role elevation | Forge token claiming admin role | API returns 401 | Critical | Integration |
| SEC-005 | Missing Bearer prefix | Send token without `Bearer` | API returns 401 | High | Integration |
| SEC-006 | SQL/XSS login payloads | Submit injection strings to login | API returns 4xx and never 500 | High | Integration |
| SEC-007 | Long input | Submit oversized identifier/name values | API rejects safely or returns non-500 | High | Integration |
| SEC-008 | Password hash exposure | Inspect login, `/me`, and user list responses | No password hash or bcrypt marker appears | Critical | Integration |
| SEC-009 | Auth rate limit | Send repeated failed login requests | API eventually returns 429 | High | Integration |
| SEC-010 | CORS allowlist | Request from unapproved origin | Browser/API denies credentialed access | High | Manual |
| SEC-011 | Audit log for mutations | Create/update/delete evaluation | Audit event records actor, path, target, status | Critical | Integration/manual |
| SEC-012 | Public registration guard | Disable public registration and attempt register | API rejects when production guard is active | High | Manual |

## Performance And Reliability

| ID | Scenario | Steps | Expected Result | Severity | Automation |
|---|---|---|---|---|---|
| PERF-001 | Dashboard load | Open dashboard with seeded dataset | First meaningful content appears within accepted target | Medium | QA robot/manual |
| PERF-002 | Evaluation list load | Open evaluations with many records | Page remains responsive and paginated/filterable if applicable | Medium | QA robot/manual |
| PERF-003 | Report generation | Generate summary and export report | API responds within accepted target and does not time out | High | Manual |
| PERF-004 | Concurrent logins | Run multiple login attempts with valid users | No 5xx and rate limiting does not block normal users | High | Manual |
| PERF-005 | Concurrent section saves | Save goals/competency/attendance rapidly | Last accepted save wins without corrupting related sections | High | Manual |
| PERF-006 | Restart recovery | Restart backend while frontend is open | User sees recoverable error and can continue after API returns | Medium | Manual |
| PERF-007 | Backup restore drill | Restore DB backup to test environment | Application starts and critical data is present | Critical | Manual |

## Regression Suites

Run these groups before merging high-risk changes:

| Change Area | Minimum Regression |
|---|---|
| Auth, session, password reset | `AUTH-*`, `SEC-003` to `SEC-009`, backend auth integration |
| Roles or access policy | `RBAC-*`, `SEC-001`, `SEC-002`, role matrix integration |
| Evaluation form or scoring | `EVAL-*`, `SCORE-*`, frontend E2E export flow |
| Reports or exports | `REP-*`, `SEC-011`, Thai/French PDF manual checks |
| Templates or cycles | `TPL-*`, `CYCLE-*`, E2E create/delete actions |
| Layout, i18n, navigation | `UI-*`, `A11Y-*`, Playwright E2E, QA robot mobile/tablet suites |
| Deployment or environment | `OPS-*`, production readiness checklist |

## Known Manual Coverage

These cases are intentionally manual today because they require real rendered
PDF inspection, production-like infrastructure, large datasets, or business
sign-off:

- Thai/French PDF visual correctness.
- Production Docker and nginx deployment validation.
- Database backup restore drill.
- Calibration approval policy with HR sign-off.
- Large import and report performance tests.
- CORS validation against real deployed origins.
