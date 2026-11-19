# Testing

Nexo tests are split by the question each layer answers. A bug that slips through one layer is usually invisible to the layers above it, so the layers are not interchangeable: pick the one that asks your question. This page is the map; each layer has its own page.

Vitest owns six file-level projects (`vite.config.ts`). Playwright owns the two that need a browser (`playwright.config.ts`).

## The layers

| Layer | Question it answers | Runner and project | Command | Needs |
| --- | --- | --- | --- | --- |
| [unit](./unit.md) | Is the business rule right, with its collaborators mocked? | Vitest `unit` | `pnpm test:unit` | nothing |
| [integration](./integration.md) | Does the query / cache behave against a real database? | Vitest `integration` | `pnpm test:integration` | Postgres + Redis |
| [component](./component.md) | Does the hook or client component behave in a DOM? | Vitest `component` (jsdom) | `pnpm test:component` | nothing |
| [contract](./contract.md) | Does `public/openapi.json` still match the code? | Vitest `contract` | `pnpm test:contract` | nothing (reads files) |
| [e2e (HTTP)](./e2e-and-browser.md) | Does the running server answer the route correctly? | Vitest `e2e` | `pnpm test:e2e` | running server + Postgres + Redis |
| [browser](./e2e-and-browser.md) | Does the real UI work in Chromium? | Playwright `chromium` | `pnpm test:browser` | build + Postgres + Redis |
| [visual](./visual.md) | Does it still look the same, pixel for pixel? | Playwright `visual` | `pnpm test:visual` | Docker, build |
| [mutation](./mutation-and-coverage.md) | Would a broken line actually fail a test? | Stryker over the `unit` suite | `pnpm test:mutation` | nothing |

A sixth Vitest project, `redis-tls`, runs `src/lib/__tests__/*.smoke.test.ts` against a TLS Redis. It runs in its own CI job (`redis-tls-smoke` in `.github/workflows/ci.yml`) and is not part of the daily loop.

<!-- DIAGRAM NEEDED: test-layers-map: the test layers (unit, integration, component, contract, e2e HTTP, browser, visual, mutation) as a pyramid or map, each with the question it answers, its runner and whether it needs infra; read docs/testing/README.md and vite.config.ts and playwright.config.ts -->

## Where a test file goes

The location decides which project runs it, through the `include` globs in `vite.config.ts`. A file outside every glob is silently never run.

| Glob | Project |
| --- | --- |
| `src/{services,mappers,schemas,errors}/**/__tests__/*.test.ts`, `src/lib/__tests__/*.test.ts`, `utils/__tests__/*.test.ts`, `lib/__tests__/*.test.ts` | unit |
| `src/repositories/**/__tests__/*.test.ts`, `src/cache/**/__tests__/*.test.ts`, `src/lib/**/__tests__/*.integration.test.ts` | integration |
| `app/**/__tests__/*.component.test.tsx`, `components/**/__tests__/*.component.test.tsx`, `src/hooks/**/__tests__/*.component.test.tsx` | component |
| `src/__tests__/contract/*.contract.test.ts` | contract |
| `app/**/__tests__/*.e2e.test.ts` | e2e (HTTP) |
| `src/lib/__tests__/*.smoke.test.ts` | redis-tls |
| `e2e/specs/*.spec.ts` | browser (Playwright) |
| `e2e/visual/*.spec.ts` | visual (Playwright) |

Two overlaps to know about. `src/lib/__tests__/` matches both `unit` (`*.test.ts`) and, through the `.integration.test.ts` / `.smoke.test.ts` suffixes, other projects; the `unit` project explicitly excludes `**/*.integration.test.ts` and `**/*.smoke.test.ts`. And the Playwright specs live in `e2e/`, outside every Vitest glob on purpose.

## Shared plumbing in `src/__tests__/`

| Path | Purpose |
| --- | --- |
| `setup.ts` | Loaded by every project. Loads `.env` and deletes `SLACK_ALERTS_WEBHOOK_URL` so no test run posts to Slack. |
| `setup.unit.ts` | Mocks `@/lib/axiom/logger`; restores and clears mocks after each test. |
| `setup.redis.ts`, `setup.integration.ts`, `setup.e2e.ts` | Redis connection defaults, table truncation, rate-limit key reset. See [integration](./integration.md). |
| `setup.component.ts` | jest-dom matchers, jsdom polyfills, in-memory storage. See [component](./component.md). |
| `factories/` | Per-entity builders: `createFake<X>` (in-memory object) and `seed<X>` (writes through Prisma). |
| `helpers/` | `result.helpers.ts` (`expectOk`, `expectErr`), `component.tsx`, `route-fetch.tsx`, `a11y.ts` (axe), `e2e.ts` (HTTP e2e), `app-routes.ts` (page route inventory). |
| `contract/` | The OpenAPI contract suite and its shared plumbing. |
| `server-only.mock.ts` | Aliased over `server-only` in `vite.config.ts` so server modules import under Vitest. |

## Which command to run

```bash
pnpm test:unit                 # fast loop while writing services, mappers, schemas
pnpm test:component            # hooks and client components
pnpm test:contract             # after touching a route, an error code or a schema
pnpm test:all                  # every Vitest project, --run (needs infra and a server)
pnpm vitest --project unit src/services/__tests__/sticky-note.service.test.ts
pnpm vitest --project unit -t "creates a sticky note"
```

`pnpm test` is plain `vitest` (watch mode), `pnpm test:ci` is `vitest --run --coverage`. `pnpm test:all` also tries to run `integration`, `e2e` and `redis-tls`, so it needs the infrastructure and a running server.

## How CI uses them

`ci.yml` runs on push to `main` and gates deploys (see [ADR 0001](../adr/0001-trunk-based-development.md)). The required jobs in the `gate` job are `lint`, `contract-tests`, `e2e-tests` (matrix `api` and `browser`, the browser leg also runs the visual suite), `coverage-tests` (unit + integration), `component-tests` (three shards), `semgrep`, `gitleaks` and `redis-tls-smoke`. <!-- DIAGRAM NEEDED: ci-test-jobs-map: which CI jobs run which test projects and feed the gate job, Codecov and the weekly mutation workflow; read .github/workflows/ci.yml and .github/workflows/mutation.yml -->

Mutation testing is a separate weekly workflow, not part of the gate. See [mutation-and-coverage](./mutation-and-coverage.md).

## Gotchas

- Integration and e2e tests truncate tables after every test. Never point them at a database you care about; see [integration](./integration.md).
- Component tests query by role and label with the exact pt-BR strings, because the UI copy is pt-BR.
- A new endpoint fails the contract suite until `public/openapi.json` documents it.

## Related files

- `vite.config.ts`, `playwright.config.ts`, `stryker.config.mjs`, `vitest.stryker.config.ts`, `codecov.yml`
- `src/__tests__/`, `e2e/`
- `.github/workflows/ci.yml`, `.github/workflows/mutation.yml`
- [Feature workflow](../development/feature-workflow.md) for when each layer is written
