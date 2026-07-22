FROM node:24-bookworm AS builder

WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --parents packages/*/package.json ./

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runtime-base

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN corepack enable
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/settings.json ./settings.json

WORKDIR /app

HEALTHCHECK CMD curl -f http://127.0.0.1:3000/health

FROM runtime-base AS runtime

WORKDIR /app
RUN pnpm --filter twitter-api-safe-relay exec playwright install --with-deps chromium
WORKDIR /app

FROM runtime-base AS runtime-firefox

WORKDIR /app
RUN pnpm --filter twitter-api-safe-relay exec playwright install --with-deps firefox
WORKDIR /app

FROM runtime-base AS runtime-webkit

WORKDIR /app
RUN pnpm --filter twitter-api-safe-relay exec playwright install --with-deps webkit
WORKDIR /app

FROM runtime AS relay

CMD ["node", "packages/server/dist/server.js"]

FROM runtime AS dashboard

CMD ["node", "packages/server/dist/debug/server.js"]

FROM runtime-base AS relay-slim

CMD ["node", "packages/server/dist/server.js"]

FROM runtime-base AS dashboard-slim

CMD ["node", "packages/server/dist/debug/server.js"]

FROM runtime-firefox AS relay-firefox

CMD ["node", "packages/server/dist/server.js"]

FROM runtime-firefox AS dashboard-firefox

CMD ["node", "packages/server/dist/debug/server.js"]

FROM runtime-webkit AS relay-webkit

CMD ["node", "packages/server/dist/server.js"]

FROM runtime-webkit AS dashboard-webkit

CMD ["node", "packages/server/dist/debug/server.js"]

FROM alpine AS init-profile

CMD rm -f /profile/Singleton* /profile/DevToolsActivePort \
    && chown -R 1000:0 /profile \
    && chmod -R g+rwX /profile
