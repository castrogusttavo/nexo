# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Nexo is a multi-tenant project management platform built on Next.js 16 (App Router), PostgreSQL/Prisma 7, Redis, and BullMQ. Package manager is **pnpm**. License is AGPL-3.0.

## Working mode (MUST follow)

Act as a **code assistant**: deliver the code to write directly in the text of your reply (fenced blocks + explanation). Only modify, create, or delete a file when the user **explicitly asks** for that file change in the current message. A general task description is not standing permission to touch the filesystem — do not call Edit/Write or mutating Bash commands without an explicit request.

## Documentation

Developer documentation lives in `docs/` in this repo, in English: start from `docs/README.md`. It holds `architecture/`, `domains/`, `api/`, `development/`, `testing/`, `operations/` (deploy, runbooks), `adr/` (decision records), `postmortems/`, `changelog/` and `diagrams/` (SVG). Read the page for the area you are touching before changing it, and update it in the same commit as the code. `docs/open-questions.md` lists what the code could not settle and known defects. The older Obsidian vault (`/home/castro/castrogusttavo-vault/101 Projects/101 Nexo/`, PT-BR) is no longer the source of truth and may be stale.

## Commands

```bash
pnpm dev                  # start infra (docker + migrations) then `next dev`
pnpm infra                # docker:start + prisma:migrate:dev (no dev server)
pnpm docker:create        # first run only — create & start infra containers
pnpm build                # prisma generate + next build
pnpm check                # biome check --fix (lint + format + organize imports)
pnpm check:ci             # biome check, no writes (use this to verify CI will pass)
```

### Tests

Each layer answers a different question, and a bug that slips through one is
usually invisible to the layers above it. Vitest owns the file-level projects
(`vite.config.ts`: unit, integration, component, contract, e2e, redis-tls
smoke); Playwright owns the two that need a browser.

```bash
pnpm test:unit               # services, mappers, schemas, errors, lib/utils — node, fast, mocked
pnpm test:integration        # repositories + cache — hits a real Postgres + Redis (serial, forks)
pnpm test:e2e                # app/**/__tests__/*.e2e.test.ts — HTTP against a running server
pnpm test:component          # hooks + client components — jsdom, Testing Library
pnpm test:contract           # public/openapi.json vs the routes, ERROR_CODES, proxy.ts, the Zod schemas
pnpm test:browser            # e2e/specs — the real UI in Chromium, against the standalone artifact
pnpm test:visual             # e2e/visual — screenshots, inside the official Playwright image
pnpm test:visual:update      # approve an intentional redesign, then review the PNG diff
pnpm test:mutation           # Stryker: would a broken line actually fail a test? (~25 min, weekly in CI)
pnpm test:all                # every vitest project, --run
pnpm test:coverage           # backend coverage: unit + integration
pnpm test:coverage:component # frontend coverage: component project (COVERAGE_SCOPE=frontend)

# single test:
pnpm vitest --project unit src/services/__tests__/sticky-note.service.test.ts
pnpm vitest --project unit -t "creates a sticky note"   # by test name
```

Test file location determines which project runs it (see `include` globs in `vite.config.ts`), so place new tests accordingly:
- `*.test.ts` under `src/services|mappers|schemas|errors` and `lib/__tests__` → **unit**
- `*.test.ts` under `src/repositories|cache` and `*.integration.test.ts` under `src/lib` → **integration** (needs DB/Redis up via `pnpm infra`)
- `app/**/__tests__/*.e2e.test.ts` → **e2e**
- `*.component.test.tsx` in a `__tests__` dir under `app/` (a route's `__tests__/` or its `_components/__tests__/`), `components/` or `src/hooks/` → **component** (hooks and pure client logic, e.g. `components/filters`, live here too)
- `src/__tests__/contract/*.contract.test.ts` → **contract** (no DB, no server: it only reads files)
- `e2e/specs/*.spec.ts` → **browser**, `e2e/visual/*.spec.ts` → **visual** (Playwright, outside the vitest globs on purpose)
- Integration tests truncate a fixed list of 12 tables (with `CASCADE`) `afterEach` (`src/__tests__/setup.integration.ts`), so they require a disposable dev database.

Component tests use `src/__tests__/helpers/component.tsx`: `renderWithProviders` / `renderHookWithProviders` (TanStack Query + nuqs, `searchParams` for URL state, returns a `user-event` instance), `mockFetch` + `apiSuccess` / `apiError` to answer at the network boundary (let the real hooks run), `getFetchCall` to assert url/method/body, and `deferredResponse` for in-flight states (optimistic updates, pending UI). Query by role/label with the exact pt-BR strings; `setup.component.ts` provides jest-dom matchers, `matchMedia`, an in-memory `localStorage` (Node 25+ shadows jsdom's) and the jsdom polyfills cmdk/input-otp need.

**Contract tests rebuild the truth from the code** instead of restating the spec: the route inventory is walked out of `app/api/**/route.ts`, the public list is parsed from `proxy.ts`, the envelope is derived from `types/http-response`, and documented request bodies are compared field by field against the Zod schemas through an explicit map that fails when a documented body has no match. A new endpoint therefore fails the contract suite until `public/openapi.json` catches up.

**The browser suite boots the standalone artifact** (`node .next/standalone/server.js`), not `next start`, because `output: 'standalone'` is what production runs — that difference is what caught a CSP that left production unable to hydrate. It runs without `bypassCSP` for the same reason. `PLAYWRIGHT_SKIP_BUILD=true` reuses an existing build while iterating.

**Visual tests run inside `mcr.microsoft.com/playwright:<version>-noble`** so baselines rasterise identically here and in CI; the wrapper refuses to run if its image tag and `@playwright/test` disagree. Threshold is `maxDiffPixelRatio: 0` — at Playwright's default a `#fff → #f5f5f4` regression passes unnoticed. Determinism is bought in the fixtures (frozen clock, motion freeze, seeded data, rate-limit key cleared between shots), never by loosening the threshold.

Coverage is reported to Codecov under two flags with separate statuses: `backend` (unit + integration, `BACKEND_COVERAGE` in `vite.config.ts`) and `frontend` (component, `FRONTEND_COVERAGE`). Add client code with logic to `FRONTEND_COVERAGE`; escape parentheses in route-group globs (`app/\\(private\\)/**`) or they silently match nothing.

### Worker (BullMQ background jobs — separate process from Next)

```bash
pnpm worker:dev           # tsx watch worker/index.ts
pnpm worker:build         # esbuild bundle → dist/worker.cjs
pnpm worker               # run the built bundle
```

### Other

```bash
pnpm prisma:studio        # browse the DB
pnpm prisma:migrate:dev   # create/apply a migration in dev
pnpm email                # preview React Email templates (components/emails) on :3001
pnpm status:collect       # one status collection (same StatusService.collect as the cron) against local .env, prints a table, exits
pnpm status:watch         # same, every 60s like production's cron, until Ctrl+C (Slack alerts fire if SLACK_ALERTS_WEBHOOK_URL is set)
```

## Architecture

### Layered request flow

API routes are thin; business logic lives in services, data access in repositories. The chain for a typical endpoint:

```
app/api/**/route.ts  →  Service  →  Repository  →  Prisma
   (withAxiom)          (Result)     (Result)
```

A route handler (`app/api/sticky-notes/route.ts` is the canonical example) is a thin composition of the wrappers in `utils/api-handler.ts` (`withAuthenticatedRoute`, `withValidatedBody`), which do these steps in order:
1. wrap the handler in `withAxiom` (from `lib/axiom/server`) for logging,
2. resolve the session via `getAuthSession()` (returns a `Result`; bail with `handleError` on `!ok`) and, where required, consent,
3. consume a rate limiter (`consume(apiLimiter, \`user:${id}\`)`),
4. validate the body with a Zod schema (`safeParse`, `standardError('VALIDATION_ERROR', ...)` on failure),
5. call the service and return `successResponse(...)` or `handleError(result.error)`.

Some routes compose the steps by hand (for example `app/api/sticky-notes/[id]/route.ts`) and a few skip them on purpose (`app/api/users/me/**`, `invitations/accept`, `health`).

### Result type — no thrown errors across layers

Services and repositories never throw; they return `Result<T, AppError>` (`src/lib/result.ts`: `ok(value)` / `err(error)`). Repositories wrap Prisma calls in try/catch and return `err(databaseError(...))` or `err(notFound(...))`. Callers narrow with `if (!result.ok) return result`. This propagates cleanly up to the route, where `handleError` maps the `AppError` to an HTTP response.

`AppError` (`src/errors/app-error.ts`) is a plain object with a `code` from the central `ERROR_CODES` registry (`src/errors/codes.ts`), which is the single source of truth mapping each code to an HTTP status. Construct errors with the factory helpers (`unauthorized()`, `forbidden()`, `notFound('Resource')`, `validationError()`, `rateLimited()`, etc.) — do not invent new codes inline; add them to `codes.ts` first.

HTTP envelope helpers live in `utils/http-response.ts`: `successResponse`, `errorResponse`, `standardError` (by `ErrorCode`), and `handleError` (by `AppError`, also sets `Retry-After` for rate limits). All responses use the `{ success, statusCode, data | error }` shape from `types/http-response`.

### The per-layer files for an entity

Each domain entity (sticky-note, short-link, workspace, user, subscription, status) typically has a parallel file in each layer:
- `src/schemas/*.schema.ts` — Zod input schemas + inferred DTO types
- `src/services/*.service.ts` — business rules, authorization checks, audit logging
- `src/repositories/*.repository.ts` — Prisma access, returns `Result`
- `src/mappers/*.mapper.ts` — Prisma model → API DTO (`toXDTO`)
- `src/cache/*.cache.ts` — Redis read-through caching (workspace, user, status)

Services own authorization (e.g. ownership checks like `value.userId !== actorId → err(forbidden())`) and emit audit events via `auditMutation` / `auditAuth` from `lib/axiom/audit`.

### Auth

Better Auth (`src/lib/auth.ts`) with the Prisma adapter, argon2 hashing, email+password, Google/GitHub OAuth, email-OTP and two-factor plugins. IDs are cuid2. Lifecycle hooks (`sendResetPassword`, `afterEmailVerification`, etc.) trigger transactional emails and audit logging. `getAuthSession()` (`src/lib/auth-session.ts`) is the accessor for **API routes** and server actions: it returns a `Result` and runs at request time (`connection()`).

**Rendering reads go through the data access layer, `src/lib/dal.ts`, never through a layout gate.** Layouts of one path render in parallel, so a redirect in a layout does not stop the layouts and pages below it from rendering and reaching the RSC payload (a real STR-61 leak, fixed 2026-10-17). `getCurrentUser()`, `requireConsentedUser(resource)` and `requireMembership(slug)` are `use cache: private` (request time on the server, kept by the client router for 5 min) and redirect or 404 on their own. Any server component that reads user or workspace data calls one of them first; `getProjectContext` / `getWikiContext` already do. `app/(private)/__tests__/access.e2e.test.ts` checks every workspace page from outside (anonymous, stranger, unconsented member with and without the cookie cache) and fails on a leaked id: add new private pages to it.

The app runs **its own Redis-backed rate limiting** (`src/lib/rate-limit.ts`) on auth routes; Better Auth's built-in limiter is enabled only in production (counted in Redis through `customStorage`, so instances share one bucket) and disabled when `DISABLE_AUTH_RATE_LIMIT=true` (set during e2e, which runs `next start` in production mode).

### Request middleware — `proxy.ts`

`proxy.ts` (not `middleware.ts`) is the edge entry point. It sets security headers (CSP with `script-src 'self' 'unsafe-inline'`, HSTS). There is deliberately no per-request nonce: `cacheComponents` prerenders a shell whose scripts cannot carry one, and a nonce with `'strict-dynamic'` left production unable to hydrate (see `docs/adr/0006-standalone-output-and-browser-tests.md`), logs via Axiom, and gates auth: routes in `PUBLIC_ROUTES` pass through; otherwise it checks the `better-auth.session_token` cookie and either 401s (for `/api/*`) or redirects to `/sign-in`. It also reads Better Auth's signed cookie cache (`src/lib/auth-cookie.ts`) and sends a user who has not accepted the terms to `/onboarding/consent-setup` before anything renders. Both checks are optimistic (no database); the DAL and the API routes are the real gates. Additional static-asset security headers are set in `next.config.ts`.

### Background jobs (BullMQ + Redis)

The worker (`worker/index.ts`) is a standalone Node process, deployed separately from the Next app. It registers one BullMQ `Worker` per queue and schedules repeatable jobs on boot.
- Queue names & typed job payloads: `src/lib/queue/jobs.ts`
- Queue singletons (lazy, with shared `defaultJobOptions` — 3 attempts, exponential backoff): `src/lib/queue/queues.ts`
- Processors: `src/lib/queue/processors/` — `data-retention` (cron cleanup of expired sessions/tokens), `account-lifecycle` (scheduled account deletion), `data-export` (GDPR-style export).
- The worker imports server-only modules via a shim (`worker/server-only.shim.ts`) since it runs outside Next; the build aliases `server-only` to it.

### Status page

`/status` is backed by proactive probes (`src/services/status/probes.ts`, `components.ts`) across eight components (app, database, cache, auth, payment, email, storage, jobs), persisted to `HealthCheck` / `ComponentDaily` and surfaced with incident timelines. `app/api/status/collect` runs the probes.

Slack alerts (`src/lib/alerts/slack.ts`, optional `SLACK_ALERTS_WEBHOOK_URL`; unset = logged no-op) fire on incident-lifecycle transitions with flap suppression (`src/services/status/status-alerts.ts`) and on every `queue.job.exhausted` (`failure-alarm.ts`, same dedup ledger). Sends are bounded by a 3s timeout, never throw, and log `alerts.slack.failed` without the URL. In production the variable is appended to the server `.env` by `cd.yml` from the CI's `SLACK_WEBHOOK_URL` secret, not sops.

### Instant navigation (Cache Components)

`cacheComponents` and `partialPrefetching` are on, and the framework validates instant navigation on **every** page in `next dev` (blocking reads show in the dev overlay and as `Error: Route ...` in the terminal). Pattern: a page renders its heading synchronously and reads `params`, the session or data inside an async component under `<Suspense>` (`PageSkeleton` in `app/(private)/_components`, `ContextSidebarSkeleton` for sidebars); layouts stay synchronous and stream their own data-bound parts. Never read the clock (`Date.now()`) after a private cache in a server component: it lands in the prefetched shell, where it is refused; decide it in a client component instead, and only after hydration (`useHydrated` from `components/hooks/use-hydrated`; see `HeaderTrialBanner`): a client component also renders on the server, and the server's clock and UTC date break hydration. Opt out with `export const instant = false` and a comment only where blocking is the point: the admin area, redirect-only pages, and public pages whose content is the record itself (an unknown id must answer a real 404). `app/loading.tsx` shows the Nexo mark (`components/brand/nexo-mark-loader.tsx`). Do not reach for `'use cache'` on data that changes at runtime: production runs seven instances with per-instance caches, so `updateTag` only reaches one of them.

### App Router layout

`app/(public)` (sign-in/up, status, docs, legal), `app/(private)/[workspace-slug]` (workspace-scoped UI, slug-based multi-tenancy), `app/onboarding`, and `app/api/**`. Shared UI in `app/_components` and `components/` (shadcn/Base UI). The API reference is rendered with Scalar at `/reference`, in development only (`app/(private)/reference/route.ts` answers 404 elsewhere); `/docs` is a placeholder page.

## Creating a new feature

Vertical-slice features follow a fixed, three-block order — **SDD → TDD → Code** (full roadmap: vault `Resources/feature-creation-roadmap.md`). The block sequence never changes; some phases collapse when the domain is trivial. Key rules:

- **Block 1 — SDD (contract first).** Design the public contract before any implementation: (0) domain contract bullets (fields, invariants, ownership scope, pagination, domain errors, LGPD sensitivity) → (1) Zod schema in `src/schemas/<feature>.schema.ts` (`Create`/`Update`/output) → (2) Prisma model + migration (`pnpm prisma migrate dev --name <slug>`) → (3) specific error codes in `src/errors/codes.ts` (`<FEATURE>_NOT_FOUND`, `_FORBIDDEN`, `_LIMIT_REACHED`). Zod first, Prisma second — decide what the API exposes before how it's stored. Only the schema tests go green in this block; the schema *is* the code.
- **Block 2 — TDD (all tests red before any implementation).** Write the whole suite, importing files that don't exist yet, so it's entirely **red**: (4) test factory in `src/__tests__/factories/` → (5) repository integration tests → (6) mapper tests → (7) service tests (happy path, authz with wrong `userId`, domain limits, the Phase-3 codes) → (8) route e2e tests. No implementation file exists yet. The pre-commit hook runs `pnpm check && pnpm tsc --noEmit`, so keep the tree type-clean as you go.
- **Block 3 — Code (implement layer by layer until green).** Write only what's needed to pass: (9) repository (pure Prisma, no business rules) → (10) mapper (`Prisma.<X> → <X>DTO`) → (11) service (business rules, `Result`) → (12) HTTP routes + `[id]` route → (13) hook + frontend wiring → (14) observability + manual smoke.
- **Authorization lives in the service**, not the route (ownership checks like session `userId == resource userId`).
- **Frontend wiring is part of "done":** creating `src/hooks/use-<feature>.ts` without integrating the existing component does not close the feature.
- **Hooks and client components get component tests** in phase 13, same TDD rule: `src/hooks/__tests__/use-<feature>.component.test.tsx` (request shape, cache writes/invalidation, optimistic rollback, `enabled` guards, error fallbacks) and a `*.component.test.tsx` next to each component with logic (validation, submit payload, pending/error states).
- **A new endpoint is not done until the spec follows it:** `public/openapi.json` is hand-maintained and the contract suite compares it to the routes, the error registry and the Zod schemas, so `pnpm test:contract` goes red until it is documented.
- **Observability before the final smoke:** Axiom logs at critical service points, plus `auditMutation`/`auditAuth` for LGPD-sensitive events. Type-check and tests verify code correctness, not feature behavior — always smoke the golden path + a few edge cases in the browser.
- Phases 9–11 collapse into near-one block for trivial domains; cache (`src/cache/`) is optional, slotted between the mapper and service when reads become a bottleneck.

## Git workflow

The project follows **trunk-based development with direct commits to `main`** (the original CI/CD flow — full detail in vault `Git/git-workflow.md`):

- **`main` is the trunk and the only working branch** — commit directly to it. There is no `dev` branch and no per-feature/per-version PR in the standard flow.
- **The CI gate is the safety net, not a PR review window.** `ci.yml` runs on `push: [main]` (lint, typecheck, unit, integration, coverage, build, and the security jobs — audit, snyk, semgrep, gitleaks). `ci.yml` skips pushes that touch only root `*.md` or `LICENSE`, so `cd.yml` never runs for them. `cd.yml` deploys only via `workflow_run` of a **successful** CI run on `main`, so a red CI never reaches production. Locally, the pre-commit hook (`pnpm check && pnpm tsc --noEmit`) and `commit-msg` (commitlint) fail fast before code leaves the machine.
- **Commit granularity is the unit of integration** — small, thematic Conventional Commits. Never `git push --force` to `main` (release tags are immutable).
- **PRs are the exception, not the rule** — reserved for external contributors. When one lands, `main` moves; there's no `dev` to resync since work happens on `main` directly. Dependency bumps are done by hand, from the security scans in `ci.yml` and `pnpm audit`: Dependabot is switched off for this repository (alerts and config both), a deliberate choice rather than an oversight.

## Conventions

- **Path alias `@/`** maps to repo root (e.g. `@/src/services/...`, `@/lib/...`, `@/components/...`). Note there are two `lib` dirs: root `lib/` (axiom, env, abacatepay, legal) and `src/lib/` (auth, prisma, redis, queue, rate-limit, result, storage, mail).
- **Component files** (vault `Resources/conventions.md#Nomes de componentes`): kebab-case file, the exported component is its exact PascalCase (`workspace-project-card.tsx` → `WorkspaceProjectCard`). In `app/_components/<domain>/` the file starts with the domain, subfolders are not repeated; route-local files (inside the route's `_components/`) start with the route's subject; generic names (`columns.tsx`, `banner.tsx`) are not allowed. The kind goes last (`-dialog`, `-form`, `-list`, `-card`, `-button`, `-picker`, `-tab`, `-field`, `-menu`, `-panel`, `-view`, `-provider`, `-skeleton`), and it is `dialog`, never `modal`, for new files. Secondary exports start with the main name (`IssueCardKanban`); non-component modules (icon maps, helpers) are named by content. Exceptions: brand casing (`posthog-tracker.tsx` → `PostHogTracker`), the barrel kit `navigation/sidebar-context/` (`nav-item.tsx` → `NavItem`) and the existing `user/modal/` account modal.
- **Component folders** (vault `Resources/conventions.md#Pastas de componentes`): `components/` is generic and never imports from `app/` (`components/ui` = shadcn primitives, `components/editor/ui` = Plate; a `shadcn add @plate/...` lands in `components/ui`, move it). `app/_components/` nests by domain ownership (`workspace/project/issue/`, later `workspace/project/cycle/`); the file prefix is the innermost domain (`workspace/project/project-card.tsx` → `ProjectCard`); subfolders are by feature (`issue/view`, `issue/picker`, `issue/filter`), never by kind (`modal/`, `card/`).
- **Route colocation** (Next.js *Project organization*: colocation plus private folders; a framework convention, not a formal standard): a route folder holds only the Next files (`page`, `layout`, `loading`, `error`, `route`, ...) and private folders prefixed with `_`, which the router ignores. Everything else lives in them by function: `_components/` (UI), `_hooks/`, `_actions/` (server actions), `_lib/` (helpers, constants, types). Component tests sit next to what they test, in `_components/__tests__/`; tests of the route files themselves (`page`, `layout`, a route's e2e) stay in `<route>/__tests__/`. A folder that only groups routes (no `page`) may own a `_components/` shared by its children. Code shared by sibling routes goes in the nearest common parent (`app/onboarding/_actions`). Sub-folders inside `_components/` are by feature, as above. File names do not change when a file moves into a private folder.
- **Env vars** are validated with Zod and split into `lib/env/env.ts` (public) and `lib/env/server.ts` (server). Import the typed export, don't read `process.env` directly. `SKIP_ENV_VALIDATION=true` / `NODE_ENV=test` bypass validation.
- **Biome** is the linter/formatter (config in `biome.json`). Note the deliberate split: 2-space indent + single quotes + no semicolons for JS/TS via the `javascript.formatter` block, but the top-level `formatter.indentStyle` is `tab`. Its `files.includes` covers only `app`, `src`, `worker`, `e2e` and `playwright.config.ts` (so `lib/`, `components/` and `utils/` are not linted). Run `pnpm check` before committing; `noParameterAssign` and several `style` rules are errors.
- **Commits** follow Conventional Commits, enforced by commitlint + Husky pre-commit hooks.
- **Code, comments, commit messages, PR titles/descriptions, and dev-facing docs (this file, the vault) are English-only.** User-facing product strings (UI copy, transactional emails, legal/marketing pages) remain in **Portuguese (pt-BR)** — match the surrounding language for those specifically.
- Prisma models use `@map`/`@@map` to snake_case DB names while keeping camelCase in code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
