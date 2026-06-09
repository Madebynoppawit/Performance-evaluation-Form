# syntax=docker/dockerfile:1
# Backend image — build context is the repo ROOT (npm-workspaces monorepo):
#   docker build -f backend/Dockerfile -t amw-backend .

# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
# OpenSSL lets Prisma detect the platform and fetch the matching query engine.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Workspace manifests first for better layer caching. All workspace
# package.json files are needed so `npm ci` can resolve the workspace graph.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

# Build the backend: generate the Prisma client, then compile TS -> dist.
COPY backend ./backend
RUN npm run db:generate -w backend \
 && npm run build -w backend \
 && mkdir -p /app/backend/node_modules

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
# Prisma's query engine needs OpenSSL; curl is used by the healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend

# Hoisted deps (incl. generated Prisma client) live at the workspace root.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/node_modules /app/backend/node_modules
COPY --from=build /app/backend/dist /app/backend/dist
COPY --from=build /app/backend/package.json /app/backend/package.json
COPY --from=build /app/backend/prisma /app/backend/prisma

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://localhost:3001/api/health || exit 1

# DB migrations run as a separate step (see docker-compose.prod.yml / CD).
CMD ["node", "dist/index.js"]
