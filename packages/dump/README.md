# twitter-api-safe-dump

Records the requests the X web app sends while a logged-in profile browses a fixed set of pages, through the same bridge as `twitter-api-safe-request`, and writes them as the `requests.ndjson` catalog that `twitter-api-safe-relay` serves at `GET /requests.ndjson` (one request object per line, the latest request of every operation).

```sh
pnpx twitter-api-safe-dump --user-data-dir ./user_data --out packages/server/requests.ndjson
```

Options:

- `--user-data-dir <dir>`: the Playwright profile to browse with (default `./user_data`); `--channel chrome` uses the system Chrome.
- `--cookies <file>`: cookies exported from a logged-in x.com session (browser extension JSON), added to the profile.
- `--proxy <url>`: `http://user:pass@host:port`.
- `--headless`: run without a window.
- `--out <file>`: where to write the catalog (default `requests.ndjson`). An existing file is merged: operations not seen in this run are kept, recorded ones replace their old line.
- `--responses <dir>`: also write the response of every operation as `<dir>/<operationName>.json`.
- `--page <path>`: extra pages to visit (repeatable).

Only the `content-type` header is kept; cookies, CSRF tokens and transaction ids never leave the browser.
