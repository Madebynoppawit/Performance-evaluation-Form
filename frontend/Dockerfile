# syntax=docker/dockerfile:1
# Frontend image — build context is the repo ROOT (npm-workspaces monorepo):
#   docker build -f frontend/Dockerfile -t amw-frontend .

# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY frontend ./frontend
# Same-origin by default: the app calls "/api", nginx proxies it to the backend.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build -w frontend

# ---- runtime stage (static via nginx) ----
FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
