# twitter-api-safe-dashboard

Vite dashboard UI for inspecting Twitter/X web API requests captured through `twitter-api-safe-request`.

```sh
pnpm --filter twitter-api-safe-dashboard dev
```

Open `http://localhost:3000`.

This package only owns the Vite UI. The debug API and replay relay live in `twitter-api-safe-relay` under `src/debug`:

```sh
pnpm --filter twitter-api-safe-relay dev:debug
```

In dev mode, the UI runs on port `5173` and proxies `/api/events` plus `/i/api/graphql/*` to the debug server on port `3000`.

From the repository root, run these in separate terminals:

```sh
pnpm dev:relay:debug
pnpm dev:dashboard
```

Run the dashboard unit tests:

```sh
pnpm test:dashboard
```
