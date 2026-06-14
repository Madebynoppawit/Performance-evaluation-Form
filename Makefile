# AMW EMS — Developer & Ops convenience commands
# Usage: make <target>

.PHONY: help dev dev-db stop build test test-unit test-integration test-e2e lint \
        up-prod up-demo up-monitor down logs backup restore shell-db migrate \
        qa qa-watch qa-auth qa-mobile

# ── Help ──────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-22s\033[0m %s\n",$$1,$$2}' \
		| sort

# ── Local development ─────────────────────────────────────────────────────────
dev-db: ## Start Postgres + pgAdmin for local development
	docker compose up -d postgres pgadmin
	@echo "Postgres: localhost:5432 | pgAdmin: http://localhost:5050"

dev: dev-db ## Start full local dev stack (db + backend + frontend watchers)
	npm run dev

stop: ## Stop all local dev containers
	docker compose down

# ── Build & quality ───────────────────────────────────────────────────────────
build: ## Build backend + frontend
	npm run build

lint: ## Run all linters
	npm run lint

test-unit: ## Run unit tests (backend + frontend)
	npm test

test-integration: ## Run integration tests against local Postgres
	@$(MAKE) dev-db
	@echo "Waiting for Postgres…"; sleep 3
	npm run db:deploy -w backend
	npm run db:seed -w backend
	npm run test:integration -w backend

test-e2e: ## Run Playwright E2E tests
	npm run test:e2e -w frontend

test: test-unit test-e2e ## Run unit + E2E tests

# ── Production stack ──────────────────────────────────────────────────────────
up-prod: ## Start production stack (requires .env.prod)
	@test -f .env.prod || (echo "Missing .env.prod — copy .env.prod.example and fill it in" && exit 1)
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

up-demo: ## Start demo stack (uses defaults — no secrets needed)
	docker compose -f docker-compose.demo.yml up -d --build
	@echo "Demo running at http://localhost:8080"

up-monitor: ## Add Prometheus + Grafana to the running prod stack
	@test -f .env.prod || (echo "Missing .env.prod" && exit 1)
	docker compose -f docker-compose.prod.yml -f docker-compose.monitor.yml \
		--env-file .env.prod up -d
	@echo "Prometheus: http://localhost:9090 | Grafana: http://localhost:3000"

down: ## Stop and remove all containers + networks (keeps volumes)
	docker compose -f docker-compose.prod.yml down 2>/dev/null || true
	docker compose -f docker-compose.demo.yml down 2>/dev/null || true
	docker compose -f docker-compose.monitor.yml down 2>/dev/null || true
	docker compose down 2>/dev/null || true

# ── Logs ─────────────────────────────────────────────────────────────────────
logs: ## Tail prod logs (Ctrl+C to exit)
	docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100

logs-backend: ## Tail backend logs only
	docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f --tail=100 backend

# ── Database ──────────────────────────────────────────────────────────────────
migrate: ## Run pending migrations against prod DB
	@test -f .env.prod || (echo "Missing .env.prod" && exit 1)
	docker compose -f docker-compose.prod.yml --env-file .env.prod \
		run --rm migrate

shell-db: ## Open a psql shell on the prod database
	@test -f .env.prod || (echo "Missing .env.prod" && exit 1)
	docker compose -f docker-compose.prod.yml --env-file .env.prod \
		exec postgres psql -U $${POSTGRES_USER:-amw} -d $${POSTGRES_DB:-performance_eval}

backup: ## Run a manual database backup
	@test -f .env.prod || (echo "Missing .env.prod" && exit 1)
	ENV_FILE=.env.prod bash scripts/backup-db.sh

restore: ## Restore a database backup: make restore FILE=path/to/backup.sql.gz
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=<backup.sql.gz>" && exit 1)
	@test -f .env.prod || (echo "Missing .env.prod" && exit 1)
	ENV_FILE=.env.prod bash scripts/restore-db.sh $(FILE)

# ── QA Robot ──────────────────────────────────────────────────────────────────
qa: ## Run QA Robot once (all suites) — requires dev server running
	node scripts/qa-robot/index.js

qa-watch: ## Run QA Robot in watch mode (repeats every 30 min)
	node scripts/qa-robot/index.js --watch

qa-auth: ## Run only the auth test suite
	node scripts/qa-robot/index.js --suite auth

qa-mobile: ## Run only the mobile test suite
	node scripts/qa-robot/index.js --suite mobile
