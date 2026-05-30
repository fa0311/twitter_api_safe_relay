# twitter-api-safe-debug

Vite debug dashboard for Twitter/X web API requests captured through `twitter-api-safe-request`.

```sh
pnpm --filter twitter-api-safe-debug dev
```

Open `http://localhost:3000`.

This package only owns the Vite UI. The debug API and replay proxy live in `twitter-api-safe-proxy` under `src/dashboard`:

```sh
pnpm --filter twitter-api-safe-proxy dev:dashboard
```

In dev mode, the UI runs on port `3000` and proxies `/api/events` plus `/i/api/graphql/*` to the debug server on port `3001`.

From the repository root, run these in separate terminals:

```sh
pnpm dev:dashboard
pnpm dev:debug
```

Run the dashboard unit tests:

```sh
pnpm test:debug
```
