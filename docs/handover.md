# Project Handover — AMW Annual Performance Evaluation System

| | |
|---|---|
| **Project** | AMW Annual Performance Evaluation System |
| **Version delivered** | `v1.4.6` |
| **Repository** | https://github.com/Madebynoppawit/Performance-evaluation-Form |
| **Handover date** | 2026-06-29 |
| **Status** | ✅ Demo-ready (spec-complete, all tests green). Production-ready pending customer infra (secrets + server). |

This document is the single delivery summary. Technical depth lives in the linked docs;
**new engineers/admins should start with the [Developer & Admin Guide](developer-guide.md).**

---

## 1. What is delivered

A production-grade, full-stack annual performance-evaluation platform:

- Position-specific evaluation form (10 sections) with a unified **1–5 scoring** model.
- Goal setting, competency (dual manager/self), attendance, comments, salary, and signatures.
- Role-based access (Developer / Admin / Manager / Supervisor / Employee).
- Admin/HR calibration workspace, cycles, reports/BI, audit trail.
- Premium **PDF** (Thai+Latin) and **CSV** export.
- Bulk **employee import from a WinDev CSV export**; identity-based password reset.
- Tri-lingual UI (Thai / English / French).

Full feature/architecture overview: [README](../README.md).

---

## 2. Deliverables checklist

| Deliverable | Where | Status |
|---|---|---|
| Frontend source (React + TS) | `frontend/` | ✅ |
| Backend source (Express + Prisma) | `backend/` | ✅ |
| Database schema + migrations | `backend/prisma/` | ✅ |
| Synthetic demo seed | `backend/prisma/seed.cjs` | ✅ |
| Automated tests (360) + QA Robot (139) | `*/src/**`, `scripts/qa-robot/` | ✅ all green |
| CI/CD pipelines | `.github/workflows/` | ✅ green |
| Docker images + compose (dev/demo/prod/monitor) | `Dockerfile`, `docker-compose.*.yml` | ✅ build clean, 0 high/critical |
| Developer & Admin guide | `docs/developer-guide.md` | ✅ |
| API reference / data model | `docs/api.md`, `docs/data-model.md` | ✅ |
| Deploy checklist / ops runbook | `docs/deploy-checklist.md`, `docs/operations-runbook.md` | ✅ |
| Test catalog / threat model | `docs/system-test-cases.md`, `docs/threat-model.md` | ✅ |
| README + overview infographic | `README.md`, `docs/screenshots/` | ✅ |

---

## 3. Acceptance status (as delivered)

- **Tests:** backend 41 unit + 139 integration, frontend 21 unit + 20 E2E, **QA Robot 139** — **360+ all green, 0 failures**.
- **CI on `main`:** green across lint, unit, integration, E2E, build, secret scan, and Docker image build + Trivy vuln-scan + push (**8/8**).
- **Security:** no real employee data or secrets in git (verified by scan); production fails fast on weak JWT secret / wildcard CORS / missing metrics token.
- **Spec:** the evaluation form, rating scale (1–5 with behavior indicators), attendance thresholds, competencies, and 1–5 summary match the HR requirement.

---

## 4. Repository & access

- **Code & history:** the GitHub repository above (all work committed and pushed).
- **Releases:** tagged on GitHub; latest is `v1.4.6`.
- **Demo login IDs/passwords:** **not in the repo** — read from `backend/prisma/seed.cjs`. Rotate before any shared rollout.
- **Secrets** (`JWT_SECRET`, DB password, `METRICS_TOKEN`, SSH deploy keys): **not in the repo** — to be created by the customer in `.env.prod` and GitHub repo/Actions secrets.

---

## 5. Environments

| Env | Compose file | Purpose |
|---|---|---|
| Development | `docker compose up -d postgres` + `npm run dev` | local coding |
| Demo | `docker-compose.demo.yml` | safe showcase (synthetic data) |
| Production | `docker-compose.prod.yml` | live (patched, scanned images) |
| Monitoring | `docker-compose.monitor.yml` | Prometheus/Grafana stack |

Run/setup steps: [Developer & Admin Guide §2](developer-guide.md) and [deploy-checklist.md](deploy-checklist.md).

---

## 6. Data & security notes

- **Employee data source:** company **WinDev** → export CSV → import via the app's
  User/Data Management page (`employeeImportService` upserts into PostgreSQL).
  The exported CSV is real PII — **keep it out of the repo**; it is never committed.
- Real data lives only in the PostgreSQL database (runtime). Back it up via
  `backup.yml` / `BACKUP_DIR` (see the runbook), **not** by saving files in the repo.
- Password reset is identity-based (employee number + date of birth), not email.

---

## 7. Outstanding items (customer responsibility, ~5% to go-live)

1. Provision a production server and PostgreSQL; fill `.env.prod` with **strong** secrets
   (`openssl rand -base64 48` for `JWT_SECRET`, DB password, `METRICS_TOKEN`).
2. Add GitHub Actions secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`) and set the
   repo variable `DEPLOY_ENABLED=true` to enable auto-deploy (it safely skips until then).
3. Point a domain + HTTPS at the frontend; configure `CLIENT_URL` / `CORS_ORIGINS`.
4. Import the real employee roster from WinDev (CSV) and rotate demo credentials.
5. Run the post-deploy smoke test in [deploy-checklist.md](deploy-checklist.md).

No known functional defects are outstanding at handover.

---

## 8. Maintenance & support recommendations

- Keep CI green; run `npm run verify` before every change; branch off `main` and PR.
- Apply base-image patches periodically (the Dockerfiles already `apt/apk upgrade`; rebuild
  monthly so the vuln scan stays clean).
- Re-run `npm run test:integration:setup` after schema/seed changes.
- Recommended ongoing support: bug fixes + minor features + dependency/security updates
  (typical 15–20%/yr of build cost).

---

## 9. Handover sign-off

| Item | Confirmed |
|---|---|
| Source code delivered & pushed to `main` | ☑ |
| All automated tests + QA Robot green | ☑ |
| CI/CD green on `main` | ☑ |
| Documentation complete (guide, API, ops, deploy, threat model) | ☑ |
| No real PII / secrets in the repository | ☑ |
| Demo environment runnable from a clean checkout | ☑ |
| Outstanding (customer) items documented | ☑ |

**Delivered by:** _________________________  **Date:** ______________

**Accepted by (AMW):** ____________________  **Date:** ______________

---

## Document index

[Developer & Admin Guide](developer-guide.md) ·
[README](../README.md) ·
[API](api.md) · [Data Model](data-model.md) ·
[Deploy Checklist](deploy-checklist.md) · [Operations Runbook](operations-runbook.md) ·
[Production Readiness](production-readiness.md) · [System Test Cases](system-test-cases.md) ·
[Threat Model](threat-model.md) · [UX/UI Standards](ux-ui-standards.md)
