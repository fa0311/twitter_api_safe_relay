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

Once the relay is running, replace the X.com origin with the relay origin and keep the path/query/body shape. GraphQL and the v1.1 / v2 REST endpoints all live under `/i/api`, as in the X web app (`/1.1/*` and `/2/*` without the prefix are still accepted). With several profiles, pick one with the `x-profile-name` header.

```sh
curl 'http://localhost:3000/i/api/graphql/gKia-nBM9kwuDEfSDeWMfQ/HomeTimeline'
curl 'http://localhost:3000/i/api/1.1/search/typeahead.json?q=elonmusk&result_type=users'
```

Typed clients work the same way: point `twitter-openapi-typescript` or `twitter_openapi_python` at `http://localhost:3000/i/api` with a bare configuration (see the [repository README](https://github.com/fa0311/twitter_api_safe_relay#from-twitter-openapi-typescript--twitter_openapi_python)).

The relay also serves the debug dashboard UI (from [`twitter-api-safe-relay-dashboard`](https://www.npmjs.com/package/twitter-api-safe-relay-dashboard)) and its API on the same port. Set `"dashboard": false` in the settings file to disable it.

## Request catalog

`GET /requests.ndjson` serves the catalog bundled with the package: one request object per line, the latest request the X web app sent for every operation it uses (GraphQL `queryId` / `features` / `fieldToggles` included). AI agents and [`twitter-api-safe-mcp`](https://www.npmjs.com/package/twitter-api-safe-mcp) pick an operation from it and only change the variables. It is recorded with `twitter-api-safe-dump` (`packages/dump` of this repository, not published), not written by hand; `recordedAt` on a line says when.
