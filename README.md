<div align="center">

<img src="frontend/public/amw-logo.png" alt="AMW Logo" height="64" />

# AMW Performance Evaluation System

Enterprise performance review platform for goal setting, competency scoring, attendance, salary review, acknowledgements, reporting, and governed exports.

[![CI](https://github.com/Madebynoppawit/Performance-evaluation-Form/actions/workflows/ci.yml/badge.svg)](https://github.com/Madebynoppawit/Performance-evaluation-Form/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.4.4-0a6ed1?style=flat-square)](https://github.com/Madebynoppawit/Performance-evaluation-Form/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-111827?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## Current Release

`v1.4.4` — configurable scoring weights, GPA-style final grades, an admin/HR calibration
workspace, identity-based password reset, and per-user temporary passwords. See the
[Changelog](CHANGELOG.md) for the full history.

| Flavor | Purpose | Default |
|---|---|---:|
| Standard | Production-style build without AI features enabled | Yes |
| AI Preview | Trial build with AI feature flags visible and auditable | No |

The AI Preview flavor is controlled by environment flags only. No model key or AI request path is enabled by default.

## Why This Exists

AMW Performance Evaluation System turns the company's appraisal forms into a governed digital workflow:

- **position-level appraisal forms** (AMW-01-036 family) — a tailored form per level: Director&Up / Manager / Officer / Supervisor / Production, selected automatically from the evaluatee's position
- position-based competency scoring (Core Competencies CC1–CC4, plus Management competencies for Manager/Director)
- weighted goals, attendance, disciplinary, salary, comment, and 3-level sign-off (Employee / Evaluator / MD) sections
- **role + position based access**: a `DEVELOPER` super-role and `ADMIN` control everything; **Supervisor / Manager / Director (MD, CEO)** can create evaluations and build templates; account creation stays with Developer/Admin
- **self-service profiles** + an admin/developer **user-management** page
- **trilingual UI** — Thai / English / French, switchable across the whole app
- premium CSV/PDF exports, Swagger/OpenAPI docs, and release metadata for Standard / AI Preview deployments

## Product Surface

| Area | What It Does |
|---|---|
| Dashboard | Executive cockpit for completion, score health, readiness, and system status |
| Evaluations | Position-level form workflow (5 form types) with requirement readiness before submission |
| Templates | Reusable review structure — buildable by Supervisor / Manager / Director and admins |
| Cycles | Review period setup and lifecycle management |
| Reports | Summary analytics, department breakdowns, audit-aware exports |
| Calibration | Admin/HR workspace to review scores and lock final GPA-style grades before cycle closure |
| Users | Developer/Admin user management; every user can self-edit their own profile |
| Access Control | `DEVELOPER` super-role, `ADMIN`, and position-based create permissions |
| Localization | Whole-app Thai / English / French switching |
| API Docs | Swagger UI and OpenAPI JSON for frontend/backend integration |

## Screenshots

| Dashboard | Evaluation Form |
|---|---|
| ![Dashboard cockpit](docs/screenshots/dashboard.png) | ![Evaluation form](docs/screenshots/evaluation-form.png) |

| Export Actions | Swagger UI |
|---|---|
| ![Premium export actions](docs/screenshots/export-actions.png) | ![Swagger UI](docs/screenshots/swagger-ui.png) |

Regenerate these assets with `npm run screenshots:readme` while the frontend and backend dev servers are running.

## Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️  Browser — React 18 · TypeScript · Vite"]
        UI["TanStack Query · Zustand · React Hook Form"]
        I18N["i18n — Thai / English / French"]
    end

    subgraph Edge["🌐  nginx (production)"]
        SPA["Static SPA + /api reverse proxy"]
    end

    subgraph Server["⚙️  Express API — Node.js"]
        MW["Middleware: JWT Auth · RBAC · Zod · Rate limit · Audit log · Request IDs"]
        RT["Routes: auth · evaluations · templates · cycles · reports · users"]
        MW --> RT
    end

    DB[("🐘  PostgreSQL<br/>cycles · scores · sign-offs · audit")]

    Client -- "REST /api/*" --> Edge --> Server
    Server -- "Prisma ORM" --> DB
    Server -. "Swagger / OpenAPI" .-> Client
```

### Evaluation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: create (Supervisor+ / Admin)
    DRAFT --> IN_PROGRESS: fill sections (goals, competency, attendance, training, comment)
    IN_PROGRESS --> SUBMITTED: submit (Evaluator)
    SUBMITTED --> REVIEWED: review (Reviewer / MD)
    REVIEWED --> CLOSED: acknowledge + calibrate grade (Admin / HR)
    CLOSED --> [*]
```

### Access Control (RBAC)

```mermaid
flowchart LR
    DEV["DEVELOPER<br/>(super-role)"] ==> ALL["Everything"]
    ADMIN["ADMIN"] --> UM["User management"]
    ADMIN --> CAL["Calibrate final grades"]
    ADMIN --> DEL["Delete evaluations"]
    SUP["Supervisor · Manager<br/>Director · MD"] --> CRE["Create evaluations"]
    SUP --> TPL["Build templates"]
    SUP --> EDT["Edit own evaluations"]
    EMP["Employee · Staff"] --> SELF["Self profile + view own"]
```

### Scoring Model (GPA-style)

```mermaid
flowchart LR
    G["Goal Setting<br/>60–70%"] --> T(("Weighted<br/>Total 1–5"))
    C["Competency / Evaluation<br/>20%"] --> T
    A["Attendance<br/>10%"] --> T
    R["Training<br/>0–10%"] --> T
    T --> GPA["Final Grade<br/>= score − 1<br/>GPA 0–4"]
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query |
| UI | Custom enterprise design system, responsive dashboard, premium export UX |
| Backend | Node.js, Express, Zod, JWT, Swagger UI |
| Data | PostgreSQL, Prisma |
| i18n | Custom lightweight system — Thai / English / French |
| Security | Helmet, CORS allowlist, rate limiting, RBAC, no-store API headers |
| Deploy | Docker (multi-stage) + nginx, docker-compose.prod, GHCR images via CI |
| Quality | TypeScript strict checks, Vitest, Node test runner, Playwright E2E |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop or PostgreSQL 16+

### Install

```bash
git clone https://github.com/Madebynoppawit/Performance-evaluation-Form.git
cd Performance-evaluation-Form
npm install
```

### Configure

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Minimum backend env:

```env
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/performance_eval"
JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"
```

### Database

```bash
docker compose up -d postgres
npm run db:deploy -w backend
npm run db:seed -w backend
```

### Run

```bash
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/api/docs/`
- OpenAPI JSON: `http://localhost:3001/api/openapi.json`

## Deployment (Production)

The full stack ships as containers — Postgres, a one-shot migration step, the
API, and an nginx-served frontend that proxies `/api` to the backend.

```bash
cp .env.prod.example .env.prod      # set POSTGRES_PASSWORD, JWT_SECRET (32+), CLIENT_URL
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- `backend/Dockerfile` — multi-stage, non-root, healthchecked; Prisma engine pinned for the runtime
- `frontend/Dockerfile` + `nginx.conf` — static SPA + `/api` reverse proxy, gzip, security headers
- migrations run as a one-shot `prisma migrate deploy` before the API starts
- the demo seed **refuses to run in production** unless `ALLOW_PROD_SEED=true`

**CI/CD** (`.github/workflows/ci.yml`): secret scan → lint / test / build / audit
→ Postgres integration tests → on `main`, build + **Trivy scan** + publish images
to `ghcr.io/<owner>/amw-{backend,frontend}`. The deploy step is left to the
target platform, which pulls those tags.

## Deployment (Demo)

Use the demo compose file for an internal deployable demo. It keeps production
runtime guards enabled, labels the app as `Demo`, runs migrations, seeds demo
accounts/workflow data, and serves the frontend through nginx.

```bash
docker compose -f docker-compose.demo.yml up -d --build
```

Open `http://localhost:8080`.

Demo credentials:

- `developer@amw-ems.com` / `P@ssw0rd!`
- `admin@amw-ems.com` / `P@ssw0rd!`
- `manager.eng@amw-ems.com` / `P@ssw0rd!`
- `supervisor1@amw-ems.com` / `P@ssw0rd!`
- `officer1@amw-ems.com` / `P@ssw0rd!`

Optional overrides live in `.env.demo.example`. For a shared demo, copy it to
`.env.demo`, change the demo passwords/secrets, and run:

```bash
docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build
```

## Release Flavors

### Standard

Backend:

```env
APP_RELEASE_CHANNEL=standard
ENABLE_AI_FEATURES=false
AI_PROVIDER=none
```

Frontend:

```env
VITE_RELEASE_CHANNEL=standard
VITE_ENABLE_AI_FEATURES=false
VITE_AI_PROVIDER=none
```

### AI Preview

Backend:

```env
APP_RELEASE_CHANNEL=ai-preview
ENABLE_AI_FEATURES=true
AI_PROVIDER=openai
```

Frontend:

```env
VITE_RELEASE_CHANNEL=ai-preview
VITE_ENABLE_AI_FEATURES=true
VITE_AI_PROVIDER=openai
```

Use `AI_PROVIDER=azure-openai` when the preview deployment is wired to Azure OpenAI later.

## Demo Accounts

Development/demo seed data includes (production seeding still requires the
explicit demo override `ALLOW_PROD_SEED=true`):

| Role / Position | Email | Password |
|---|---|---|
| Developer (super-admin) | `developer@amw-ems.com` | `P@ssw0rd!` |
| Administrator | `admin@amw-ems.com` | `P@ssw0rd!` |
| Manager | `manager.eng@amw-ems.com` | `P@ssw0rd!` |
| Supervisor | `supervisor1@amw-ems.com` | `P@ssw0rd!` |
| Officer | `officer1@amw-ems.com` | `P@ssw0rd!` |

Demo-only credentials. Change credentials and keep public registration disabled
before any shared rollout.

## Quality Gate

```bash
npm run verify
```

The release gate runs:

- backend and frontend TypeScript checks
- backend and frontend unit tests
- Playwright E2E tests on desktop and mobile
- production build
- high-severity dependency audit

### Local Integration Test Database

Backend integration tests use `backend/.env.test` and expect a migrated, seeded
PostgreSQL database named `amw_test`.

```bash
docker compose up -d postgres
npm run test:integration:setup
npm run test:integration
```

Run `npm run test:integration:setup` again after adding or changing Prisma
migrations or seed data.

Latest local verification for `v1.4.4`: passed (backend 35/35, QA Robot 136/136, functional write-flow audit 28/28).

## API Snapshot

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness, version, and release metadata |
| GET | `/api/ready` | Public | API/database readiness |
| GET | `/metrics` | Token/Network | Prometheus metrics (process + HTTP) |
| GET | `/api/docs/` | Public | Swagger UI |
| GET | `/api/openapi.json` | Public | OpenAPI spec |
| POST | `/api/auth/login` | Public | Authenticate and receive JWT |
| PATCH | `/api/auth/me` | Bearer | Self-service profile update |
| GET | `/api/evaluations` | Bearer | List evaluations scoped by role |
| POST | `/api/evaluations` | Supervisory+ | Create evaluation (Supervisor / Manager / Director / Admin) |
| DELETE | `/api/evaluations/:id` | Admin | Delete evaluation |
| PATCH | `/api/evaluations/:id/grade` | Admin/HR (calibrate) | Set final calibrated grade |
| POST | `/api/templates` | Supervisory+ | Build a template |
| GET | `/api/reports/summary` | Manager/Admin | Summary reporting |
| GET | `/api/users` | Admin/Developer | User management (create/edit/delete) |
| GET | `/api/users` (list) | Supervisory+ | Read directory to pick an evaluatee |

## Documentation

- [Changelog](CHANGELOG.md)
- [API Notes](docs/api.md)
- [Data Model](docs/data-model.md)
- [Production Readiness](docs/production-readiness.md)
- [Threat Model](docs/threat-model.md)
- [Operations Runbook](docs/operations-runbook.md)
- [UX/UI Standards](docs/ux-ui-standards.md)

## Project Structure

```text
Performance-evaluation-Form/
  backend/
    prisma/
    src/
      config/
      controllers/
      docs/
      middleware/
      routes/
      services/
  frontend/
    src/
      components/
      config/
      features/
      hooks/
      i18n/
      lib/
  docs/
  .github/
```

## License

MIT (c) Madebynoppawit
