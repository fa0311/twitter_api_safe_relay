# twitter-api-safe-relay-dashboard

Vite dashboard UI for inspecting Twitter/X web API requests captured through twitter-api-safe-request.

This package ships only the built frontend assets. [`twitter-api-safe-relay`](https://www.npmjs.com/package/twitter-api-safe-relay) depends on it and serves the UI by default (`"dashboard": false` in the relay settings disables it):

```sh
pnpx twitter-api-safe-relay [settings-file]
```

```json
{
  "port": 3000,
  "profiles": [
    {
      "name": "account1",
      "browser": {
        "type": "launch",
        "userDataDir": "./user_data/account1"
      }
    }
  ]
}
```

See [`twitter-api-safe-relay`](https://www.npmjs.com/package/twitter-api-safe-relay) for the full settings reference and relay endpoints.

For workspace development, run:

```sh
pnpm dev:relay
```

The Vite UI runs on port `5173` and proxies API requests to the relay server on port `3000`.
