# twitter-api-safe-relay

HTTP relay server for safe Twitter/X web API requests through Playwright profiles.

```sh
pnpx twitter-api-safe-relay [settings-file]
```

Reads the settings file (JSON or JSONC; comments and trailing commas are allowed) given as the first argument. Without an argument, an interactive prompt asks which browser to launch:

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

The browser starts on the first request; sign in to X/Twitter when it opens. If the Playwright Chromium browser is not installed, either run `pnpx playwright install chromium` or set `"channel": "chrome"` in the browser settings to use the system Chrome.

Once the relay is running, replace the X.com origin with the relay origin and keep the path/query/body shape:

```sh
curl 'http://localhost:3000/i/api/graphql/gKia-nBM9kwuDEfSDeWMfQ/HomeTimeline'
```

The relay also serves the debug dashboard UI (from [`twitter-api-safe-relay-dashboard`](https://www.npmjs.com/package/twitter-api-safe-relay-dashboard)) and its API on the same port. Set `"dashboard": false` in the settings file to disable it.
