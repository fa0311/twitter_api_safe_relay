# twitter-api-safe-relay-dashboard

Dashboard server and Vite UI for inspecting Twitter/X web API requests.

Place `settings.json` in the current working directory, then run:

```sh
pnpx twitter-api-safe-relay-dashboard
```

The package includes the built UI, dashboard API, and relay server.

For workspace development, run:

```sh
pnpm dev:relay
```

The Vite UI runs on port `5173` and proxies API requests to the dashboard server on port `3000`.
