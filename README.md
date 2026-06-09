<div align="center">

<img src="frontend/public/amw-logo.png" alt="AMW Logo" height="64" />

# AMW Performance Evaluation System

Enterprise performance review platform for goal setting, competency scoring, attendance, salary review, acknowledgements, reporting, and governed exports.

[![CI](https://github.com/Madebynoppawit/Performance-evaluation-Form/actions/workflows/ci.yml/badge.svg)](https://github.com/Madebynoppawit/Performance-evaluation-Form/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.2.0--rc.1-0a6ed1?style=flat-square)](https://github.com/Madebynoppawit/Performance-evaluation-Form/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-111827?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## Current Release

`v0.2.0-rc.1` is the requirement-aligned release candidate for internal trial usage.

| Flavor | Purpose | Default |
|---|---|---:|
| Standard | Production-style build without AI features enabled | Yes |
| AI Preview | Trial build with AI feature flags visible and auditable | No |

The AI Preview flavor is controlled by environment flags only. No model key or AI request path is enabled by default.

## Why This Exists

AMW Performance Evaluation System turns an annual performance review form into a governed digital workflow:

- weighted goals with target levels from 1 to 5
- position-based competency scoring
- attendance, disciplinary, salary, and acknowledgement sections
- role-aware review access for employees, managers, and admins
- premium CSV/PDF exports for formal records
- Swagger/OpenAPI documentation for backend handoff
- release metadata for Standard and AI Preview deployments

## Product Surface

| Area | What It Does |
|---|---|
| Dashboard | Executive cockpit for completion, score health, readiness, and system status |
| Evaluations | End-to-end form workflow with requirement readiness before submission |
| Templates | Reusable review structure for competency, attendance, salary, comments, and acknowledgement |
| Cycles | Review period setup and lifecycle management |
| Reports | Summary analytics, department breakdowns, audit-aware exports |
| Users | Admin-managed users, positions, departments, and manager hierarchy |
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

```text
Browser
  React 18 + TypeScript + Vite
  TanStack Query + Zustand + React Hook Form
        |
        | REST /api/*
        v
Express API
  JWT Auth + RBAC + Zod validation
  Audit log + rate limit + request IDs
        |
        | Prisma ORM
        v
PostgreSQL
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query |
| UI | Custom enterprise design system, responsive dashboard, premium export UX |
| Backend | Node.js, Express, Zod, JWT, Swagger UI |
| Data | PostgreSQL, Prisma |
| Security | Helmet, CORS allowlist, rate limiting, RBAC, no-store API headers |
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

Development seed data includes:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@amw-ems.com` | `P@ssw0rd!` |
| Manager | `manager.eng@amw-ems.com` | `P@ssw0rd!` |
| Employee | `officer1@amw-ems.com` | `P@ssw0rd!` |

Change credentials and disable public registration before any real rollout.

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

Latest local verification for `v0.2.0-rc.1`: passed.

## API Snapshot

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness, version, and release metadata |
| GET | `/api/ready` | Public | API/database readiness |
| GET | `/api/docs/` | Public | Swagger UI |
| GET | `/api/openapi.json` | Public | OpenAPI spec |
| POST | `/api/auth/login` | Public | Authenticate and receive JWT |
| GET | `/api/evaluations` | Bearer | List evaluations scoped by role |
| POST | `/api/evaluations` | Admin | Create evaluation |
| DELETE | `/api/evaluations/:id` | Admin | Delete evaluation |
| GET | `/api/reports/summary` | Manager/Admin | Summary reporting |
| GET | `/api/reports/evaluations/:id/export` | Bearer | Export evaluation CSV |
| GET | `/api/users` | Admin | User management |

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
