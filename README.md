# twitter-api-safe-relay

A TypeScript monorepo for calling the internal Twitter/X Web App API client from a logged-in browser opened with Playwright.

This is not just another Node.js HTTP client. It opens X.com in a real browser, hooks into the Web App's webpack runtime, captures the internal API client used by the page, and dispatches requests from Node.js through `page.evaluate()`.

In other words, this project delegates requests to the logged-in browser context instead of reimplementing cookies, auth state, CSRF handling, Web App request behavior, feature flags, and other moving parts in Node.js.

## What makes it different?

This project finds the API client that the X/Twitter Web App uses inside the browser, hooks into it, and lets that client perform requests on your behalf.

```mermaid
flowchart LR
	curl["HTTP client"]
	app["Your Node.js app"]
	server["twitter-api-safe-relay"]
	package["twitter-api-safe-request"]
	xclient["X Web App<br/>internal API client"]

	app -->|"call function"|package
	curl -->|"HTTP request"| server
	server -->|"call function"| package
	package -->|"injected bridge"| xclient
```

The important part is that Node.js does not directly reimplement X's internal API behavior. Instead, requests are routed through the client extracted from the live X Web App, so they run in the same browser environment as the Web App itself.

## Setup

### Docker

The `Dockerfile` builds three images:

- **init-profile** — a one-shot job that prepares the shared browser profile volume (fixes permissions, clears stale Chrome lock files).
- **relay** — the HTTP relay server (`dist/server.js`).
- **dashboard** — the debug server with the web dashboard UI (`dist/debug/server.js`).

See `docker/` for the Docker Compose setup.

### Local

```sh
pnpm install
```

Install Playwright browsers if needed.

```sh
pnpm exec playwright install
```

## Tests

Run the dashboard unit tests:

```sh
pnpm test:dashboard
```

The request and relay test scripts exercise browser-backed integration flows:

```sh
pnpm test:request
pnpm test:relay
```

## Configuration

Configure the relay server port, log level, and browser profiles in the workspace-level `settings.json`.

```json
{
  "port": 3000,
  "logLevel": "info",
  "profiles": [
    {
      "name": "account1",
      "browser": {
        "type": "cdp",
        "browserType": "chromium",
        "cdpEndpoint": "http://127.0.0.1:9222"
      }
    }
  ]
}
```

Each profile's `browser` is one of two types:

- `cdp` — connect to an already-running browser over the Chrome DevTools Protocol via `cdpEndpoint` (used by the Docker setup, which points at the kasmweb Chrome). Sign in to X/Twitter in that browser and keep the session.
- `launch` — let Playwright launch a persistent context. Set `userDataDir` to the profile storage path; on first launch, sign in to X/Twitter in the browser and keep the session saved before using the relay.

## `twitter-api-safe-request` example

`twitter-api-safe-request` is published on npm:

https://www.npmjs.com/package/twitter-api-safe-request

```sh
pnpm add twitter-api-safe-request
```

```ts
import { chromium } from "playwright";
import { createTwitterBrowser } from "twitter-api-safe-request";

const context = await chromium.launchPersistentContext("./user_data/account1", {
  headless: false,
});

const page = await context.newPage();
const client = createTwitterBrowser(page);
await client.inject();

await client.goto("https://x.com/home");

const result = await client.dispatch({
  method: "GET",
  path: "/2/users/me",
  params: {},
});
```
