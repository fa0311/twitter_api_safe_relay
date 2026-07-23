# twitter-api-safe-relay

HTTP relay server for safe Twitter/X web API requests through Playwright profiles.

```sh
pnpx twitter-api-safe-relay
```

Reads `./settings.json` from the current working directory:

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

Sign in to X/Twitter in the launched browser on first run. If the Playwright Chromium browser is not installed, either run `pnpx playwright install chromium` or set `"channel": "chrome"` in the browser settings to use the system Chrome.

Once the relay is running, replace the X.com origin with the relay origin and keep the path/query/body shape:

```sh
curl 'http://localhost:3000/i/api/graphql/gKia-nBM9kwuDEfSDeWMfQ/HomeTimeline'
```

The dashboard is published separately:

```sh
pnpx twitter-api-safe-relay-dashboard
```
