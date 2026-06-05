<div align="center">

<img src="frontend/public/amw-logo.png" alt="AMW Logo" height="60" />

# AMW Performance Evaluation System

**ระบบประเมินผลการปฏิบัติงาน — Enterprise-grade, template-driven, role-aware**

[![CI](https://github.com/Madebynoppawit/Performance-evaluation-Form/actions/workflows/ci.yml/badge.svg)](https://github.com/Madebynoppawit/Performance-evaluation-Form/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.0-0a6ed1?style=flat-square)](https://github.com/Madebynoppawit/Performance-evaluation-Form/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## Overview

AMW Performance Evaluation System unifies every review style — **self-assessment**, **manager review**, and **full 360° feedback** — under a single, configurable data model.

- Reviewers complete **weighted, template-driven** forms
- Scores are **computed automatically** with configurable weights
- Access to sensitive feedback is governed by **role-based rules** enforced server-side
- Salary impact, competency scoring, attendance, and goal-setting in one workflow

---

## Features

| Module | Description |
|---|---|
| 🗂 **Templates** | Build reusable evaluation forms with weighted sections (Competency, Attendance, Goal Setting, Salary, Comment, Acknowledgement) |
| 🔄 **Cycles** | Define named review periods, attach templates, and open/close evaluation windows |
| 📋 **Evaluations** | Per-employee review forms with auto-computed section and total scores |
| 📊 **Reports** | Cycle-level BI — average scores, completion rate, department breakdown chart |
| 👤 **User Management** | ADMIN-managed user registry with department, position, and manager hierarchy |
| 🏠 **Dashboard** | Real-time overview — completion rate, active cycles, animated KPI cards |

---

## Tech Stack

### Frontend
| | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Routing | React Router v6 |
| State | Zustand (auth) + TanStack Query v5 (server state) |
| Forms | React Hook Form + Zod |
| UI | Custom design system (`kbt-*`) — dark/light theme, Inter + JetBrains Mono |
| Charts | Recharts |

### Backend
| | Technology |
|---|---|
| Runtime | Node.js + Express |
| ORM | Prisma 5 + PostgreSQL |
| Auth | JWT (Bearer token) |
| Validation | Zod |
| Security | express-rate-limit, RBAC middleware |

---

## Architecture

```
┌─────────────────────────────────────┐
│            Browser (Vite)           │
│   React + TanStack Query + Zustand  │
└──────────────┬──────────────────────┘
               │ REST /api/*
┌──────────────▼──────────────────────┐
│         Express API Server          │
│  Rate Limit → Auth → RBAC → Route   │
└──────────────┬──────────────────────┘
               │ Prisma ORM
┌──────────────▼──────────────────────┐
│           PostgreSQL 16             │
└─────────────────────────────────────┘
```

### Role Matrix

| Action | EMPLOYEE | MANAGER | ADMIN |
|---|:---:|:---:|:---:|
| View own evaluations | ✅ | ✅ | ✅ |
| Fill evaluation form | ✅ | ✅ | ✅ |
| View team evaluations | ❌ | ✅ | ✅ |
| Create evaluations | ❌ | ✅ | ✅ |
| Manage templates | ❌ | ❌ | ✅ |
| Manage cycles | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View all reports | ❌ | ✅ | ✅ |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL) or local PostgreSQL 16

### 1. Clone & install

```bash
git clone https://github.com/Madebynoppawit/Performance-evaluation-Form.git
cd Performance-evaluation-Form

# Install root deps
npm install

# Install backend & frontend deps
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment

```bash
# Backend — see .env.example for all variables (grouped & documented)
cp .env.example backend/.env

# Frontend (optional — only needed to override the API base URL)
cp frontend/.env.example frontend/.env.local
```

Backend config is **validated at startup** (`backend/src/config/env.ts`): the
server refuses to boot on invalid config and prints exactly which variables are
wrong. In `NODE_ENV=production` it also rejects a weak/placeholder `JWT_SECRET`.

Generate a strong secret:

```bash
openssl rand -base64 48
```

Minimum required in `backend/.env`:

```env
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/performance_eval"
JWT_SECRET="<openssl rand -base64 48>"
```

Everything else (`PORT`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, `CLIENT_URL` /
`CORS_ORIGINS`, `RATE_LIMIT_*`, `LOG_LEVEL`) has sensible defaults — see
`.env.example`.

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Migrate & seed database

```bash
cd backend
npm run db:deploy   # run migrations
npm run db:seed     # create demo users
```

### 5. Start servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## Demo Accounts

> ⚠️ For development only — change credentials before any production deployment.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@company.com` | `P@ssw0rd!` |
| Manager | `manager.eng@company.com` | `P@ssw0rd!` |
| Employee | `officer1@company.com` | `P@ssw0rd!` |

---

## Testing

```bash
# Unit tests (fast, no database) — backend + frontend
npm test
```

Unit tests are DB-free and CI-safe (backend uses a committed `.env.test`).
Both run automatically in CI on every push/PR.

**Integration tests** (real HTTP + Postgres) run separately:

```bash
# One-time: create & seed a test database
docker compose up -d postgres
docker exec performance-evaluation-form-postgres-1 \
  psql -U postgres -c "CREATE DATABASE amw_test"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amw_test" \
  npm run db:deploy -w backend && \
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/amw_test" \
  npm run db:seed -w backend

# Run them (uses .env.test → amw_test)
npm run test:integration -w backend
```

CI runs integration tests in a dedicated job with a Postgres service
(migrate → seed → supertest against the real Express app, covering auth,
authn guards, and RBAC).

---

## API Reference

Base URL: `http://localhost:3001`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Server health + version |
| `POST` | `/api/auth/login` | — | Authenticate, returns JWT |
| `GET` | `/api/auth/me` | Bearer | Current user profile |
| `GET` | `/api/dashboard/stats` | Bearer | KPI summary |
| `GET` | `/api/evaluations` | Bearer | List evaluations (scoped by role) |
| `POST` | `/api/evaluations` | MANAGER+ | Create evaluation |
| `GET` | `/api/templates` | Bearer | List templates |
| `POST` | `/api/templates` | ADMIN | Create template |
| `GET` | `/api/cycles` | Bearer | List cycles |
| `POST` | `/api/cycles` | ADMIN | Create cycle |
| `GET` | `/api/reports/summary` | MANAGER+ | Cycle-level report |
| `GET` | `/api/users` | ADMIN | List users |
| `POST` | `/api/users` | ADMIN | Create user |

---

## Project Structure

```
Performance-evaluation-Form/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Data model
│   │   └── seed.ts             # Demo data
│   └── src/
│       ├── controllers/        # Request handlers
│       ├── services/           # Business logic
│       ├── routes/             # Express routers
│       ├── middleware/         # auth, RBAC, rate-limit, errorHandler
│       └── utils/              # JWT helpers
└── frontend/
    └── src/
        ├── components/         # Layout, ShellBar, SideNav, Toast, ErrorBoundary
        ├── features/           # auth, dashboard, evaluations, templates, cycles, reports
        ├── hooks/              # useAuth, useThemeMode
        ├── lib/                # axios instance, utils
        └── pages/              # NotFoundPage
```

---

## Changelog

### v0.1.0 - 2026-06-05

Initial CEO-ready product release for the AMW Performance Evaluation System.

#### Product
- Premium dark UI design system with animated cards, shimmer buttons, glass toasts, and responsive dashboard views
- Dashboard with KPI cards, sparklines, trend badges, completion metrics, and report-ready summaries
- End-to-end evaluation workflow covering goals, competency, attendance, comments, salary summary, and acknowledgement
- Template, cycle, user, report, and evaluation modules wired through the React frontend and Express REST API

#### API & Security
- Express REST API with JWT bearer authentication, role-aware routing, and Prisma-backed PostgreSQL persistence
- Evaluation access is scoped server-side so non-admin users can only read or modify evaluations where they are the evaluatee or evaluator
- Template API validation now matches the Prisma/frontend contract for `THREE_SIXTY` evaluation types and lowercase question types
- Auth rate limiting is enabled for login/register endpoints
- `/health` and `/api/health` endpoints are available for monitoring

#### Testing & Quality
- Backend unit tests added for evaluation scoring, attendance scoring, competency scoring, goal scoring, and evaluation access rules
- Frontend unit tests added for score tiers, label helpers, score formatting, and competency selection by position
- `npm test -w backend` and `npm test -w frontend` are available as workspace test commands
- Build validation passes for both backend and frontend

#### Release Notes
- Frontend package version: `0.1.0`
- Backend package version: `0.1.0`
- Architecture: modular monolith with React frontend, Express REST API backend, and PostgreSQL database

### v0.1.0 — 2026-06-04
- ✨ Premium dark UI design system (animated cards, shimmer buttons, glass toasts)
- 🏠 Dashboard with count-up KPI cards, sparklines, and trend badges
- 🔒 Rate limiting on auth endpoints (20 req / 15 min)
- 🛡 Error Boundary + 404 page
- 👥 `/api/users` ADMIN-only route
- 🔧 Axios timeout, endDate validation, delete confirmation
- 📦 `/health` endpoint for monitoring

---

## License

MIT © [Madebynoppawit](https://github.com/Madebynoppawit)
