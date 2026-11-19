# End-to-end tests: HTTP and browser

Two suites share the word "e2e" and answer different questions. Do not confuse them.

| | HTTP e2e | Browser e2e |
| --- | --- | --- |
| Question | Does the running server answer this route or page correctly? | Does the real UI work for a user? |
| Runner | Vitest project `e2e` | Playwright project `chromium` |
| Files | `app/**/__tests__/*.e2e.test.ts` | `e2e/specs/*.spec.ts` |
| Command | `pnpm test:e2e` | `pnpm test:browser` |
| Server | One you started (`E2E_BASE_URL`, default `http://localhost:3000`) | Booted by `playwright.config.ts` |

## HTTP e2e (Vitest)

Tests use plain `fetch` against a server that is already running. Setup (`src/__tests__/setup.e2e.ts`): before each test it deletes every Redis key matching `rl:*` (rate-limit counters, which the table truncation does not touch, and which the rate-limit spec deliberately trips); after each test it truncates the same table set as the integration layer plus `consent_events`; `afterAll` disconnects Prisma and Redis. Config: serial (`pool: 'forks'`, `maxWorkers: 1`), 30 s timeout.

Helpers live in `src/__tests__/helpers/e2e.ts`: `createAuthenticatedUser()` signs up through `/api/auth/sign-up/email` with a unique `x-forwarded-for` (the auth limiter is per IP), marks the email verified directly in the database (the OTP mail is a no-op), and signs in for a session cookie. Also `defaultHeaders`, `getJson`, `postJson`, `createWorkspaceForUser`, `authenticatedOwner`, `withoutSessionCache`.

Reference: `app/api/sticky-notes/__tests__/route.e2e.test.ts` (401 without a session via the proxy, only the caller's rows, 201 on create). `app/(private)/__tests__/access.e2e.test.ts` checks every workspace page from outside (anonymous, stranger, unconsented member) and fails on a leaked id; new private pages belong in it (see [ADR 0003](../adr/0003-dal-instead-of-layout-gates.md)).

CI (`e2e-tests`, matrix `suite: api`): builds, starts `pnpm start &`, polls `http://localhost:3000`, then runs `pnpm test:e2e`. It sets `DISABLE_AUTH_RATE_LIMIT=true` and `MAIL_DRY_RUN=true`.

## Browser e2e (Playwright)

Specs in `e2e/specs/` drive Chromium (desktop 1440x900, locale `pt-BR`, timezone `America/Sao_Paulo`). They live in `e2e/`, outside every Vitest glob.

```bash
pnpm test:browser
PLAYWRIGHT_SKIP_BUILD=true pnpm test:browser   # reuse an existing build while iterating
```

### The server under test is the standalone artifact

`webServer` in `playwright.config.ts` runs `pnpm build` (unless `PLAYWRIGHT_SKIP_BUILD=true`), copies `.next/static` and `public` into `.next/standalone`, then `node .next/standalone/server.js`. It also builds and starts the realtime server (`pnpm realtime:build && node dist/realtime.cjs`) for the wiki editor specs, unless `PLAYWRIGHT_REALTIME=false`. The server env forces `DISABLE_AUTH_RATE_LIMIT=true`, `MAIL_DRY_RUN=true` and `NODE_ENV=production` (a `.env` with `NODE_ENV=development` would otherwise build a development bundle and fail while prerendering).

Reasons, recorded in the config comments: `output: 'standalone'` is what production runs and `next start` refuses to serve it; and there is no `bypassCSP`, so the suite runs under the CSP production sends. That is what exposed a CSP that left production unable to hydrate (`e2e/specs/csp.spec.ts`). See [ADR 0006](../adr/0006-standalone-output-and-browser-tests.md).

### Fixtures

`e2e/fixtures/test.ts`:

- `test`: signed-in. One onboarded account (user, verified email, workspace) per Playwright worker, created through the HTTP API, with `storageState` and a pre-set `nx_cookie_consent=rejected` cookie so the banner does not swallow clicks. Dropped after the worker. Also an `api` fixture, a signed-in `APIRequestContext` for arranging data.
- `anonTest`: signed out, with a unique synthetic client IP (`uniqueClientIp()`) so the auth limiter (10 attempts per 15 min per `ip:pathname`) never leaks between specs or runs.
- `signedOutTest`: signed out but the worker account exists, for specs that need credentials.
- `uniqueSuffix()`, `atPath(path)` (a `toHaveURL` predicate that avoids interpolating a slug into a `RegExp`).

`e2e/fixtures/db.ts` talks to the database straight through Prisma only for what a browser cannot do: marking email verified, reading the OTP. Everything else goes through the UI or the HTTP API.

Specs create their own uniquely named data, so `fullyParallel` is on. CI uses 2 workers, 1 retry, `forbidOnly`, and keeps traces on first retry. A global timeout of 20 min and a per-test timeout of 90 s apply.

## Gotchas

- Both suites need Postgres and Redis (and, in CI, MinIO-compatible storage) up; see [getting-started](../development/getting-started.md).
- The browser tests and the visual tests both want port 3000, so CI runs them one after the other.
- `pnpm tsc --noEmit -p e2e` type-checks the specs (separate `e2e/tsconfig.json`, so Playwright's types stay out of the main program). The pre-commit hook runs it.
- CLAUDE.md says the vitest e2e suite runs against `next start` in production mode; CI starts it with `pnpm start`, which wraps `next start` (`scripts/next-banner.mjs`). The Playwright config comment says `next start` refuses `output: 'standalone'`. Whether the HTTP suite's server is the standalone artifact is `TODO: confirm`.

## Related files

- `vite.config.ts` (`e2e` project), `src/__tests__/setup.e2e.ts`, `src/__tests__/helpers/e2e.ts`
- `playwright.config.ts`, `e2e/fixtures/`, `e2e/specs/`
- `.github/workflows/ci.yml` (`e2e-tests`)
- [Visual tests](./visual.md), [Testing overview](./README.md)
