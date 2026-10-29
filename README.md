[c19yamamoto.com](https://c19yamamoto.com)

## Application tests

`npm test` builds the static site and runs Playwright tests against the exported page. `npm run test:app` runs the tests against an existing `out/` export.

The tests use Python 3's built-in HTTP server and Playwright's Chromium browser. Install Chromium once with `npx playwright install chromium`.
