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

CMD ["node", "dist/dashboard/server.js"]


FROM kasmweb/chrome:1.18.0 AS dashboard

USER root

WORKDIR /twitter_api_safe_proxy

ENV NODE_ENV=production

RUN apt-get update \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/settings.json ./settings.json

RUN mkdir -p /twitter_api_safe_proxy/user_data \
    && chown -R 1000:0 /twitter_api_safe_proxy

COPY docker/kasm_custom_startup.sh /dockerstartup/custom_startup.sh
RUN chmod +x /dockerstartup/custom_startup.sh

USER kasm-user

WORKDIR /twitter_api_safe_proxy/packages/server

ENV VNC_PW=password

