# twitter-api-safe-request

Safe request helpers for Twitter/X web API access through a Playwright persistent profile.

```ts
import { createHookManager, createTwitterBrowser } from "twitter-api-safe-request";
import { chromium } from "playwright";

const context = await chromium.launchPersistentContext("./user_data/account1", {
  headless: false,
});
const page = await context.newPage();
const client = createTwitterBrowser(page);
await client.inject();
await client.goto("https://x.com/home");

const hooks = createHookManager();
hooks.addHook("debug", (entry) => {
  console.log(entry);
});
await client.initHook(hooks.runHooks);

const result = await client.graphQLFullResponse(
  {
    queryId: "query-id",
    operationName: "OperationName",
    operationType: "query",
    metadata: {
      featureSwitches: [],
      fieldToggles: [],
    },
  },
  {},
);
```
