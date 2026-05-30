FROM node:24-bookworm AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --parents packages/*/package.json ./

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:24-bookworm AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/settings.json ./settings.json

RUN pnpm --filter twitter-api-safe-proxy exec playwright install --with-deps chromium

WORKDIR /app/packages/server

FROM runtime AS proxy

CMD ["node", "dist/server.js"]

FROM runtime AS debug

CMD ["node", "dist/debug/server.js"]
