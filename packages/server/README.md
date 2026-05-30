# twitter-api-safe-proxy

HTTP proxy server for safe Twitter/X web API requests through Playwright profiles.

```sh
twitter-api-safe-proxy
```

Reads settings from `../settings.json` relative to the working directory. In this workspace, the shared default settings file lives at `packages/settings.json`.

The debug API and replay proxy are available as a separate entry point:

```sh
twitter-api-safe-debug
```

In the workspace, use `pnpm --filter twitter-api-safe-proxy dev:dashboard` during development. It serves `/api/events` and `/i/api/graphql/*` on port `3001` for the Vite debug UI.
