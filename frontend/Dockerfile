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
ARG VITE_APP_VERSION=0.2.0-rc.1
ARG VITE_RELEASE_CHANNEL=standard
ARG VITE_ENABLE_AI_FEATURES=false
ARG VITE_AI_PROVIDER=none
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_RELEASE_CHANNEL=$VITE_RELEASE_CHANNEL
ENV VITE_ENABLE_AI_FEATURES=$VITE_ENABLE_AI_FEATURES
ENV VITE_AI_PROVIDER=$VITE_AI_PROVIDER
RUN npm run build -w frontend

# ---- runtime stage (static via nginx) ----
FROM nginx:1.27-alpine AS runtime
# Rate-limit zone definitions (http context) + server block config
COPY frontend/nginx.ratelimit.conf /etc/nginx/conf.d/00-ratelimit.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=4s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
