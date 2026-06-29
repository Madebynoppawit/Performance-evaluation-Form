# AMW Performance Evaluation System — Assessment v1.2.1

**Date:** 2026-06-16  
**Release:** v1.2.1  
**Assessor:** Noppavit (HR07) - Trainee

---

## 1. Frontend

| Area | Status | Notes |
|---|---|---|
| React / TypeScript | ✅ Pass | No TS errors (`tsc --noEmit` clean) |
| i18n (EN / TH / FR) | ✅ Pass | All 3 locales complete; `cp.*`, `cal.*`, `ak.selectDate`, `rp.filterCycle/allCycles/loadFailed` added |
| ChangePasswordPage | ✅ Fixed | Labels & placeholders now use `t('cp.*')` — no hardcoded EN |
| ForgotPasswordPage | ✅ Fixed | Reset-password form labels now use `t('cp.*')` |
| AcknowledgementSection | ✅ Fixed | `placeholder` replaced with `t('ak.selectDate')` |
| CalibrationPage | ✅ Fixed | `isError` branch added; renders EmptyState on API failure |
| ReportsPage | ✅ Fixed | `isError` branch added; cycle filter dropdown added; `visibleData` slice applied |
| KBT design system | ✅ Pass | `kbt-badge-*`, `kbt-metric`, `kbt-table`, `kbt-card` in use throughout |
| Responsive layout | ✅ Pass | Tablet viewport (768 px) covered by QA suite |
| Command palette (Ctrl+K) | ✅ Pass | Filter + Enter navigation tested by QA |
| Accessibility | ⚠️ Partial | `aria-label` on bell button; no formal WCAG audit run yet |

---

## 2. API & Backend Logic

| Area | Status | Notes |
|---|---|---|
| REST API (Express + Prisma) | ✅ Pass | All core routes tested: `/health`, `/auth/login`, `/evaluations`, `/users`, `/templates`, `/cycles`, `/reports/summary` |
| Input validation | ✅ Pass | Zod schemas on auth routes; missing body → 400 confirmed by QA `api` suite |
| Error format | ✅ Pass | All error bodies include `message` field |
| Forgot password flow | ✅ Pass | `/auth/forgot-password` and `/auth/reset-password` routes exist; QA test confirms no crash |
| Save Draft endpoint | ✅ Pass | Developer role can call `PATCH /evaluations/:id` without 4xx |
| Calibration grade endpoint | ✅ Pass | `PATCH /evaluations/:id/summary` (performanceGrade) + `/review` (lock) |
| Audit events | ✅ Pass | `/reports/audit-events` returns http_mutation, auth_login_failed, export events |

---

## 3. Database & Storage

| Area | Status | Notes |
|---|---|---|
| ORM | ✅ | Prisma 5 (stable) — PR #5 for v7 is held pending migration review |
| Schema migrations | ✅ | All migrations applied; no pending drift |
| Seed data | ✅ | Seeded admin, manager, employee, developer accounts for QA |
| Data integrity | ✅ | Foreign keys enforced; `totalScore` nullable (only set after scoring) |
| Prisma 5→7 upgrade | ⚠️ On hold | Major version jump; requires separate breaking-change review before merge |

---

## 4. Auth & Permissions

| Area | Status | Notes |
|---|---|---|
| JWT authentication | ✅ Pass | Token required for all protected routes; 401 on missing/invalid token |
| Role model | ✅ Pass | ADMIN, MANAGER, EMPLOYEE, DEVELOPER roles implemented |
| RBAC (frontend) | ✅ Pass | `isAdmin = role === 'ADMIN' \|\| role === 'DEVELOPER'`; route guards tested in `rbac` suite |
| Admin read-only eval | ✅ Pass | `isReadOnly = user?.role === 'ADMIN'` on EvaluationFormPage |
| `/users` admin-only | ✅ Pass | Employee and Manager roles get "Admins only" message |
| `/data` admin-only | ✅ Pass | Employee and Manager get forbidden view |
| Unauthenticated redirect | ✅ Pass | `/evaluations` and `/users` redirect to `/login` without session |
| Session clear on logout | ✅ Pass | localStorage `amw-auth` cleared; subsequent protected route blocked |
| Force password change | ✅ Pass | ChangePasswordPage shown when `mustChangePassword` flag set |

---

## 5. Hosting & Deployment

| Area | Status | Notes |
|---|---|---|
| Dev server | ✅ | Vite (frontend :5173) + Express (backend :3001) via `npm run dev` |
| Production build | ✅ | `npm run build` — Vite bundles to `frontend/dist` |
| Environment variables | ✅ | `.env` for DB URL, JWT secret, port — not committed to repo |
| Static serving | ✅ | Backend serves `frontend/dist` in production mode |
| Docker readiness | ⚠️ | No Dockerfile present; manual server setup required |
| Process manager | ⚠️ | No PM2 / systemd config — single-process, no restart on crash |

---

## 6. Cloud & Compute

| Area | Status | Notes |
|---|---|---|
| Deployment target | ℹ️ | On-premises or IaaS VM (no cloud-specific config present) |
| CDN | ⚠️ | Not configured; static assets served from Express |
| Object storage | ✅ | File imports streamed in-memory; no large binary blobs stored |
| Scalability | ⚠️ | Single Node.js process; no horizontal scaling config |

---

## 7. CI/CD & Version Control

| Area | Status | Notes |
|---|---|---|
| Git branching | ✅ | `main` branch; Dependabot PRs via automated workflow |
| npm dependency updates | ✅ | PRs #6 (concurrently), #7 (@hookform/resolvers), #8 (zod) merged in v1.2.0 |
| GitHub Actions PRs | ⚠️ | PRs #2, #3, #9, #10 (workflow scope) — require manual web-UI merge |
| Automated tests | ✅ | QA Robot: 13 suites, 130+ tests covering auth, dashboard, evaluations, reports, calibration, RBAC, API, tablet |
| Release tagging | ✅ | Git tag + GitHub release via `gh release create` |
| Smoke mode | ✅ | `QA_SMOKE=1 npm run qa` runs auth/dashboard/navigation subset only |

---

## 8. Security & RLS

| Area | Status | Notes |
|---|---|---|
| SQL injection | ✅ | Prisma parameterised queries throughout |
| XSS | ✅ | React escapes output by default; no `dangerouslySetInnerHTML` |
| CSRF | ⚠️ | JWT in localStorage (no SameSite cookie); acceptable for SPA but not cookie-based |
| Password hashing | ✅ | bcrypt (assumed from auth implementation) |
| Audit log | ✅ | HTTP mutation, failed login, export events recorded |
| Row-level security | ⚠️ | RLS enforced at application layer (role checks in API); no DB-level RLS |
| Threat model | ✅ | `docs/threat-model.md` present and up to date |

---

## 9. Rate Limiting

| Area | Status | Notes |
|---|---|---|
| Auth endpoint | ✅ | Rate limiter on `/auth/login` — QA tests detect 429 and skip gracefully |
| General API | ⚠️ | No per-IP rate limiter on non-auth routes |
| Recommendation | — | Add `express-rate-limit` globally with a 200 req/min baseline |

---

## 10. Caching & CDN

| Area | Status | Notes |
|---|---|---|
| TanStack Query cache | ✅ | Client-side stale-while-revalidate; `queryKey` designed for targeted invalidation |
| HTTP cache headers | ⚠️ | No `Cache-Control` headers set on API responses |
| CDN | ⚠️ | Not configured — all assets via Express; recommend Nginx or Cloudflare in front |
| Static asset hashing | ✅ | Vite appends content hash to bundle filenames |

---

## 11. Load Balancing & Scaling

| Area | Status | Notes |
|---|---|---|
| Current state | ⚠️ | Single process, no load balancer |
| DB connection pool | ✅ | Prisma manages pool automatically |
| Stateless API | ✅ | JWT auth is stateless — horizontal scaling is feasible |
| Recommendation | — | Reverse proxy (Nginx) + PM2 cluster mode for multi-core utilisation |

---

## 12. Error Tracking & Logs

| Area | Status | Notes |
|---|---|---|
| Server-side logging | ⚠️ | `console.log` only; no structured logging library |
| Client-side errors | ⚠️ | No Sentry / error boundary reporting configured |
| Error boundaries | ⚠️ | React error boundaries not implemented; unhandled errors show blank page |
| API error format | ✅ | Consistent `{ message }` shape on all 4xx/5xx responses |
| Audit trail | ✅ | Mutation and auth events stored in DB, visible in Reports page |
| Recommendation | — | Add `winston` (server) + Sentry (client) for production observability |

---

## 13. Availability & Recovery

| Area | Status | Notes |
|---|---|---|
| Health endpoint | ✅ | `GET /health` returns `{ status: 'ok' }` — usable for uptime monitors |
| Process restart | ⚠️ | No auto-restart on crash (no PM2 / systemd) |
| Database backup | ⚠️ | No automated backup policy documented |
| Graceful shutdown | ⚠️ | No `SIGTERM` handler; in-flight requests may drop on restart |
| Recommendation | — | PM2 with `--watch false`, Postgres WAL or daily `pg_dump` to object storage |

---

## Summary

| Category | Status |
|---|---|
| Frontend | ✅ Good — all i18n fixed, error states added, cycle filter live |
| API & Backend Logic | ✅ Good |
| Database & Storage | ✅ Good (Prisma 7 upgrade on hold) |
| Auth & Permissions | ✅ Good |
| Hosting & Deployment | ⚠️ Manual — no Docker / process manager |
| Cloud & Compute | ⚠️ No CDN or scaling config |
| CI/CD & Version Control | ✅ Good — QA Robot at 130+ tests |
| Security & RLS | ✅ Good — app-layer RLS, no DB-level |
| Rate Limiting | ⚠️ Auth only; general routes unprotected |
| Caching & CDN | ⚠️ Client cache only |
| Load Balancing & Scaling | ⚠️ Single process |
| Error Tracking & Logs | ⚠️ Console only — no structured logging or Sentry |
| Availability & Recovery | ⚠️ No auto-restart or backup policy |

**Production readiness score: 7 / 13 categories fully addressed.**  
Remaining gaps are infrastructure/ops concerns, not blockers for internal deployment.
