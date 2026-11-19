# Mutation testing and coverage

Two different questions about the same tests. Coverage asks: did this line run? Mutation testing asks: if this line were subtly wrong, would a test go red? Line coverage can sit above 95% while proving only the first.

## Coverage

Coverage uses the `v8` provider (`vite.config.ts`) and is measured in two scopes that are uploaded to Codecov under separate flags.

| Flag | Command | What it measures | Includes |
| --- | --- | --- | --- |
| `backend` | `pnpm test:coverage` (`vitest --run --coverage --project unit --project integration`) | unit + integration | `BACKEND_COVERAGE`: services, mappers, schemas, errors, repositories, cache, a few `src/lib` files (`auth-session`, `rate-limit`, `rate-limit-helpers`, `result`), `utils/**`, `lib/abacatepay.ts`, `lib/sentry/scrub.ts`, `app/api/**/route.ts` |
| `frontend` | `pnpm test:coverage:component` (`COVERAGE_SCOPE=frontend`, component project) | component | `FRONTEND_COVERAGE`: `src/hooks/**`, `lib/posthog/client.ts`, and every `'use client'` file under `app`, `components/hooks`, `components/layouts`, plus the pure client modules in `PURE_CLIENT_DIRS` (issue filter engine and list layout) |

They are separate because merging roughly 500 client files into the backend include would sink a 95%+ number into something meaningless. Server Components are excluded from the frontend scope (Testing Library cannot render them), as are `app/(web)` and `app/api`. Reports go to `./coverage` and `./coverage/frontend`.

### In CI

- `coverage-tests` runs `pnpm test:coverage` and uploads `coverage/lcov.info` with `flags: backend`.
- `component-tests` runs `pnpm test:coverage:component --shard=N/3` in three shards, each uploading with `flags: frontend`.

`codecov.yml`: `after_n_builds: 4` (one backend upload plus three frontend shards) so Codecov does not report before the last lands. Project status per flag uses `target: auto` with `threshold: 1%` and fails if CI failed. Patch status: backend `70%` (threshold 5%), frontend `70%` but `informational: true`. `carryforward: true` keeps the other flag's last report when a run uploads only one. `app/api/**` is in Codecov's `ignore` list.

## Mutation testing (Stryker)

```bash
pnpm test:mutation       # stryker run, about 25 minutes
```

Config: `stryker.config.mjs`. Runner: Vitest, via `vitest.stryker.config.ts`, which flattens the `unit` project into a single-project config because Stryker's Vitest runner has no `--project` switch and would otherwise boot integration, e2e and component. The two files must stay in sync: if the `unit` project's `include`, `setupFiles` or alias change, mirror them there.

- **Scope (`mutate`):** `src/services`, `src/mappers`, `src/errors`, `src/lib/result.ts`, `src/lib/rate-limit.ts`, `src/lib/queue`, `utils`, excluding tests, `.d.ts` and `src/errors/index.ts`. These are the places where a survivor is a real hole.
- **`coverageAnalysis: 'perTest'`** runs only the tests that covered a mutated line. **`ignoreStatic: true`** skips mutants in module-level initialisation, which cannot be re-tested per test.
- **`StringLiteral` mutants are excluded** (log event names, audit actions and error messages that no test asserts). `ObjectLiteral` stays on: it empties audit payloads (noise) but also repository call arguments (real gaps).
- **Thresholds:** `high: 85`, `low: 65`, `break: 77`. The comment records the history: 70.34% first measurement, 80.09% on the first CI run (2026-09-21). `break` should sit a few points under the current score; raise it as the score climbs.
- `incremental: true` with `.stryker/incremental.json`; reports in `.stryker/reports/` (HTML and JSON), all gitignored.
- `concurrency: 3`, `timeoutMS: 30000`, `timeoutFactor: 2.5`, type checks disabled.

### In CI

`.github/workflows/mutation.yml` runs on a self-hosted runner every Monday at 04:00 UTC and on `workflow_dispatch`, timeout 60 minutes. It is not in the CI gate on purpose: `cd.yml` deploys off a successful CI run, and 25 minutes would delay every deploy.

## Gotchas

- A new file under `src/services` or `src/mappers` enters the mutation scope automatically; thin tests that only execute lines will show up as survivors.
- `app/api/**/route.ts` is in the backend coverage `include`, but route handlers run in a separate server process that v8 cannot instrument (and Codecov ignores `app/api/**`), so they never show as covered by the e2e suite. A dedicated e2e coverage script is not present in `package.json`.
- Do not chase surviving `auditMutation` / `logger` payload mutants; do chase the repository-argument ones.

## Related files

- `vite.config.ts` (`BACKEND_COVERAGE`, `FRONTEND_COVERAGE`), `codecov.yml`
- `stryker.config.mjs`, `vitest.stryker.config.ts`, `.github/workflows/mutation.yml`
- `.github/workflows/ci.yml` (`coverage-tests`, `component-tests`)
- [Unit tests](./unit.md), [Testing overview](./README.md)
