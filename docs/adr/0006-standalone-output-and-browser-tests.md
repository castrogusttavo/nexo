# 0006. Standalone output, tested as built in a real browser

- Status: Accepted
- Date: 2026-09-20
- Commits: `08512633` (browser suite against the real artifact), `1d3f61bb` (ship the middleware in the image and a CSP the app survives), both 2026-09-20; `299a0270` (visual baselines retaken from the standalone build, 2026-10-12); `637fa492` (pin `@playwright/test` to the visual image version, 2026-11-18)

## Context

`next.config` sets `output: 'standalone'`, which is what production runs. `next start` refuses to serve it, and every other test layer either speaks HTTP or renders in jsdom, where a browser's own enforcement never happens. That gap hid two production bugs, found the day the browser suite first ran:

- `.dockerignore` listed `proxy.ts`, so every production image shipped without the middleware: no CSP, no HSTS, and private URLs answered 200 to anonymous visitors. The build never complained.
- Putting the middleware back exposed a CSP that blocked everything: it used a per-request nonce with `'strict-dynamic'`, but `cacheComponents` prerenders the shell at build time, so its bootstrap scripts carry no nonce, and `'strict-dynamic'` makes browsers ignore `'self'`. In Chromium against the standalone server, 27 scripts were blocked and nothing was interactive, so production could not hydrate.

## Decision

- The browser suite (`pnpm test:browser`, Playwright, `e2e/specs`) boots `node .next/standalone/server.js`, not `next start`, and runs without `bypassCSP`, so CSP breakage fails a test. `PLAYWRIGHT_SKIP_BUILD=true` reuses an existing build while iterating. In CI it reuses the e2e job's build, database and object store.
- The visual suite runs inside `mcr.microsoft.com/playwright:<version>-noble` so baselines rasterise identically locally and in CI; the wrapper refuses to run if its image tag and `@playwright/test` disagree (`637fa492`). The threshold is `maxDiffPixelRatio: 0`; determinism is bought in fixtures (frozen clock, motion freeze, seeded data), never by loosening the threshold.
- CSP `script-src` is `'self'` plus `'unsafe-inline'` (a documented trade-off, like `style-src`). It still refuses scripts from other origins and eval in production. The nonce plumbing was removed; if `cacheComponents` is ever turned off, the nonce path can work again.
- A contract test fails if `.dockerignore` drops anything the server needs, naming the file.

## Consequences

- The tests exercise the artifact users get, so build-context and CSP mistakes fail in CI.
- The browser and visual suites are slower and need a build, a pinned Playwright image, and baseline upkeep (`pnpm test:visual:update`, reviewed as a PNG diff).
- `'unsafe-inline'` in `script-src` is a conscious weakening versus a nonce-based policy.

## Alternatives considered

- Browser tests against `next start`: impossible with `output: 'standalone'` (stated in `08512633`).
- Hash-based CSP: rejected in `1d3f61bb` because the roughly 50 inline scripts Next streams differ on every request.
- Keeping the nonce with `'strict-dynamic'`: measured broken (27 scripts blocked).
- Default visual threshold: rejected in `CLAUDE.md` because a `#fff` to `#f5f5f4` regression passes unnoticed.

Related: [security](../architecture/security.md), [infrastructure](../architecture/infrastructure.md).
