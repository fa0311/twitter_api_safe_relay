# twitter-api-safe-relay

HTTP relay server for safe Twitter/X web API requests through Playwright profiles.

```sh
twitter-api-safe-relay
```

Reads settings from `../settings.json` relative to the working directory. In this workspace, the shared default settings file lives at `packages/settings.json`.

The debug API and replay relay are available as a separate entry point:

```sh
twitter-api-safe-debug
```

In the workspace, use `pnpm --filter twitter-api-safe-relay dev:debug` during development. It serves `/api/events` and `/i/api/graphql/*` on port `3000` for the Vite dashboard UI.
