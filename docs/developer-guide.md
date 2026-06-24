# Developer & Admin Guide — START HERE

Onboarding for anyone picking up the AMW Performance Evaluation System. Read this
first, then dive into the focused docs linked at the bottom.

> **Golden rule — never commit real employee data.** The repo holds code + a
> *synthetic* demo seed only. Real names, employee numbers, DOB, and salaries live
> in the database (runtime) and in CSV files kept **outside** the repo. See
> [Security & data rules](#security--data-rules).

---

## 1. What this is

A full-stack annual performance-evaluation platform:

- **Frontend** — React 18 + TypeScript + Vite (custom "KBT" / SAP-Fiori design system, Thai/EN/FR i18n).
- **Backend** — Express + Prisma 5 + PostgreSQL, JWT auth.
- **Tooling** — Vitest / Playwright / node:test, a custom QA Robot UI suite, Docker + GitHub Actions CI.

The product surface, architecture diagrams, and screenshots live in the [README](../README.md).

---

## 2. Local setup

**Prerequisites:** Node 20+, npm, Docker (for PostgreSQL), Git.

```bash
git clone <repo> && cd Performance-evaluation-Form
npm install                       # installs all workspaces (root, frontend, backend)

# Database (Docker) + env
docker compose up -d postgres     # local PostgreSQL on :5432
cp .env.example backend/.env      # then edit DATABASE_URL / JWT_SECRET if needed

# Migrate + seed demo data
npm run db:deploy                 # apply migrations
npm run db:seed                   # synthetic demo accounts + one demo evaluation

# Run both servers (backend :3001, frontend :5173)
npm run dev
```

Open <http://localhost:5173>. **Demo login IDs/passwords are not in the repo** — read
them from [`backend/prisma/seed.cjs`](../backend/prisma/seed.cjs). Quick-login chips on
the login screen cover each role.

---

## 3. Project structure

```
frontend/   React app (features/, components/, lib/, i18n/)
backend/    Express API (src/{routes,controllers,services,middleware,config}, prisma/)
scripts/    qa-robot/ (UI test bot), deploy + maintenance scripts
docs/        this guide + focused references (api, data-model, runbook, …)
docker-compose.*.yml   dev / demo / prod / monitoring stacks
.github/workflows/     ci.yml (build·scan·push), deploy.yml, backup.yml
```

Where common things live:

| Looking for… | File |
|---|---|
| Evaluation form UI | `frontend/src/features/evaluations/EvaluationFormPage.tsx` |
| Form definitions (sections per level) | `frontend/src/features/evaluations/constants/formDefinitions.ts` |
| Competencies per position (CC/MC/TCM) | `frontend/src/features/evaluations/constants/competency.ts` |
| PDF export | `frontend/src/lib/download.ts` |
| Score scale / tiers | `frontend/src/lib/score.ts` |
| Auth store (token, session) | `frontend/src/features/auth/authStore.ts` |
| Translations (en/th/fr) | `frontend/src/i18n/translations.ts` |
| API env validation | `backend/src/config/env.ts` |
| Attendance / scoring logic | `backend/src/services/attendanceService.ts`, `evaluationSectionService.ts` |
| DB schema | `backend/prisma/schema.prisma` |
| Demo seed (synthetic) | `backend/prisma/seed.cjs` |

---

## 4. Key concepts & conventions

- **Scoring is a single 1–5 scale** everywhere — form, PDF, dashboard, reports, calibration.
  (The old 0–4 "GPA" display was retired; `toGpa` in `score.ts` is now a pass-through.)
  Weighted total = Goal 60–70% + Competency/Evaluation 20% + Attendance 10% + Training 0–10%.
- **Auth** — JWT (HS256, 12h). The frontend persists the token in `sessionStorage`
  (`auth-storage`, via Zustand `persist`) so a **reload keeps the session**. If you touch
  `authStore.ts`, keep `token` in `partialize` or refresh silently logs users out.
- **RBAC** — `DEVELOPER` = everything; `ADMIN` = management + `calibrate` (blocked from editing
  evaluation content); `MANAGER`/supervisory = create cycles + evaluate; `EMPLOYEE` = own data.
  Backend enforces it (`requireRole`, `authorizeEvaluation`); the UI hides controls per role.
- **Forms** — two shapes: *weighted* (manager/appraisal) and *OSE* (officer level). The
  active shape comes from `formType` → `getFormDefinition`. Competency descriptions are
  **fixed per position** (the evaluator only scores).
- **PDF** — `jsPDF` with dual fonts: a Thai font (U+0E00–0E7F) + Helvetica Latin. Use
  `setTextFont(text)` (picks the font per string) — text drawn with the wrong font renders
  blank. Verify visually by exporting (the Read tool / pdf.js can render pages).
- **i18n** — flat key dictionaries (`en`/`th`/`fr`). The Vite OXC transformer rejects
  curly-quote string delimiters: **use straight quotes** in `.ts`/`.tsx`, especially FR strings.

---

## 5. Security & data rules

- **Never commit real employee data.** `seed.cjs` is synthetic (names = job titles, `OFF-001`,
  DOB `1990-01-01`, "Demo-only" salaries). Real data enters via the UI or CSV import and lives
  in PostgreSQL only.
- **No demo credentials in public docs** — README/docs point to `seed.cjs` for passwords.
- `.env`, `.env.prod` are gitignored. Production fails fast on a weak `JWT_SECRET` (<32 chars),
  wildcard CORS, or a missing `METRICS_TOKEN` (see `backend/src/config/env.ts`).
- More: [threat-model.md](threat-model.md).

---

## 6. Dev workflow

1. Branch off `main` (don't push straight to `main`).
2. Make the change; keep the surrounding style.
3. Run the gate locally before pushing:
   ```bash
   npm run verify          # tsc + unit + e2e + build + audit (both workspaces)
   ```
4. Open a PR. **CI must be green (8 checks):** Lint, Unit tests, Integration (Postgres),
   E2E smoke, Build, Secret scan, and Build/scan/push images (frontend + backend).
5. Commit messages: conventional prefixes (`feat`, `fix`, `docs`, `chore`, `ci`).

---

## 7. Testing

| Suite | Command | What it covers |
|---|---|---|
| Backend unit | `npm test -w backend` | scoring, middleware, utils |
| Backend integration | `npm run test:integration` | API + Postgres (`amw_test` DB) |
| Frontend unit | `npm test -w frontend` | components (Vitest + jsdom) |
| Frontend E2E | `npm run test:e2e` | Playwright (mocked API), desktop + mobile |
| **QA Robot** | `npm run qa` | real UI flows across roles (catches things mocks miss — e.g. the reload-logout bug) |

Integration tests need a migrated/seeded `amw_test` DB: `npm run test:integration:setup` first
(re-run after schema/seed changes). Full catalog: [system-test-cases.md](system-test-cases.md).

---

## 8. Common tasks (recipes)

- **Add a field to a user/evaluation:** edit `backend/prisma/schema.prisma` → `npm run db:migrate`
  → update the service `select`, the Zod schema in the controller, the TS type in
  `frontend/src/types`, and the form/PDF render.
- **Add a translation:** add the key to all three locales in `translations.ts` (straight quotes),
  then use `t('key')`.
- **Change scoring weights / thresholds:** weights come from the template/evaluation; attendance
  thresholds live in `backend/src/services/attendanceService.ts` (and the display table in
  `frontend/.../AttendanceSection.tsx` — keep them in sync).
- **Add a competency:** `frontend/src/features/evaluations/constants/competency.ts` (set the
  `positions` array + per-position `descriptions`).
- **Run & screenshot the app:** start servers, then drive with Playwright/headless Chrome
  (see [reference: screenshot workflow] in the team memory / README screenshots).

---

## 9. Admin operations

For admins/HR running the live system:

- **Users** — User Management page (Admin/Developer only): add/edit/delete, reset to a one-time
  temp password. Bulk: **CSV/TSV import** (`employeeImportService`) — keep the source file out of git.
- **Cycles** — create review periods (supervisory roles); close/delete is admin/developer only.
- **Calibration** — review scores and lock the final 1–5 grade before cycle closure.
- **Reports** — performance BI, department leaderboard, audit trail, CSV export.
- **Password reset** — identity-based (employee number + DOB), **not** email.

Day-2 operations (backups, metrics, incident response): [operations-runbook.md](operations-runbook.md).

---

## 10. Deployment

Production is Docker Compose (`docker-compose.prod.yml`) with patched, vuln-scanned images.

```bash
# on the server, with .env.prod filled in (strong secrets):
docker compose -f docker-compose.prod.yml up -d
```

Auto-deploy via GitHub Actions is **gated** behind the repo variable `DEPLOY_ENABLED=true`
(set it once `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY` secrets exist); until then the deploy
job skips instead of failing. Full steps: [deploy-checklist.md](deploy-checklist.md) and
[production-readiness.md](production-readiness.md).

---

## Doc map

| Doc | Use it for |
|---|---|
| [README](../README.md) | product overview, architecture, screenshots, quick start |
| [api.md](api.md) | REST API reference |
| [data-model.md](data-model.md) | DB schema / relationships |
| [system-test-cases.md](system-test-cases.md) | QA/UAT test catalog |
| [deploy-checklist.md](deploy-checklist.md) | production deploy steps |
| [operations-runbook.md](operations-runbook.md) | day-2 ops, backups, incidents |
| [production-readiness.md](production-readiness.md) | go-live gate |
| [threat-model.md](threat-model.md) | security model |
| [ux-ui-standards.md](ux-ui-standards.md) | design-system conventions |
