# Architecture overview

Nexo is a multi-tenant project management platform. This page is the map: what runs where, how the code is layered, and which deeper document to read next. It describes the code as it is in the repository, not a target design.

## Stack

- **Web app:** Next.js 16 (App Router) with `cacheComponents` and `partialPrefetching` enabled and `output: 'standalone'` (`next.config.ts`). Production runs the standalone server.
- **Database:** PostgreSQL through Prisma 7 with the `@prisma/adapter-pg` driver adapter (`src/lib/prisma.ts`). A read replica client exists (`src/lib/prisma-replica.ts`) and falls back to the primary when `DATABASE_URL_REPLICA` is unset. Migrations never go through the pooled URL.
- **Redis:** one `redis` client (`src/lib/redis.ts`) used for rate limiting, read-through caches and BullMQ.
- **Background jobs:** BullMQ workers in a separate process (`worker/index.ts`); queue definitions and processors live in `src/lib/queue/`.
- **Auth:** Better Auth with the Prisma adapter (`src/lib/auth.ts`). See [auth.md](./auth.md).
- **Observability:** Axiom logging (`lib/axiom/`), audit events through `auditMutation` / `auditAuth`.

## Process layout

Two kinds of process share PostgreSQL and Redis:

1. The Next.js server (pages, server components, route handlers under `app/api/**`, and `proxy.ts` at the edge entry).
2. The worker, a standalone Node bundle that is built with esbuild and registers one BullMQ `Worker` per queue. It imports server-only modules through a shim (`worker/server-only.shim.ts`).

See `../diagrams/background-jobs.svg` for the job side.

## Layers

API routes are thin. Business rules live in services and data access in repositories:

```
app/api/**/route.ts -> Service -> Repository -> Prisma
```

Each domain entity has a parallel file per layer:

| Layer | Location | Responsibility |
| --- | --- | --- |
| Schema | `src/schemas/*.schema.ts` | Zod input schemas and inferred DTO types |
| Service | `src/services/*.service.ts` | Business rules, authorization, audit |
| Repository | `src/repositories/*.repository.ts` | Prisma access only |
| Mapper | `src/mappers/*.mapper.ts` | Prisma model to API DTO |
| Cache | `src/cache/*.cache.ts` | Optional Redis read-through |

Services and repositories never throw across layers; they return `Result<T, AppError>`. See [request-flow.md](./request-flow.md) and [ADR 0002](../adr/0002-result-instead-of-throw.md).

## Two entry paths, two gates

The same data is reachable by two paths, and each has its own gate:

- **API routes** resolve the session with `getAuthSession()` (`src/lib/auth-session.ts`), which returns a `Result`.
- **Server-rendered pages** call the data access layer in `src/lib/dal.ts` (`requireMembership`, `requireConsentedUser`, `getCurrentUser`). Layouts are not used as a security boundary. See [auth.md](./auth.md) and [ADR 0003](../adr/0003-dal-instead-of-layout-gates.md).

`proxy.ts` sits in front of both and only makes optimistic decisions (cookie present, cookie-cached consent) without touching the database.

## Multi-tenancy in one paragraph

Tenancy is by workspace, addressed by slug in the URL (`app/(private)/[workspace-slug]`). A `Membership` row links a user to a workspace with a role. There is no row-level security in the database; isolation is enforced in code. Details in [multi-tenancy.md](./multi-tenancy.md).

## Caching in one paragraph

Three unrelated mechanisms exist: Redis read-through caches in `src/cache/`, the per-user `use cache: private` scopes in the DAL, and the client router cache. Runtime data is deliberately not put behind `'use cache'`. Details in [caching.md](./caching.md) and [ADR 0004](../adr/0004-no-use-cache-for-runtime-data.md).

## App Router layout

- `app/(public)`: sign-in, sign-up, status, docs, legal.
- `app/(private)/[workspace-slug]`: workspace-scoped UI (`(home)`, `ai`, `projects`, `settings`, `wiki`); also `admin`, `create-workspace` under `app/(private)`.
- `app/onboarding`: onboarding and consent steps.
- `app/api/**`: route handlers (admin, auth, careers, coupons, health, invitations, payment, short-links, status, sticky-notes, talk-to-sales, users, workspaces).

## Delivery

Work is committed directly to `main` and gated by CI; see [ADR 0001](../adr/0001-trunk-based-development.md).

## Gotchas

- This is not the Next.js of older versions. `proxy.ts` replaces `middleware.ts`, and the docs shipped in `node_modules/next/dist/docs/` are the reference.
- `typescript.ignoreBuildErrors` is `true` in `next.config.ts`, so `next build` does not fail on type errors; type safety is enforced by `tsc --noEmit` in the pre-commit hook and CI instead.
- There are two `lib` directories: root `lib/` (axiom, env, legal) and `src/lib/` (auth, prisma, redis, queue, rate-limit, result).

## Related files

- `next.config.ts`, `proxy.ts`
- `src/lib/prisma.ts`, `src/lib/redis.ts`, `src/lib/auth.ts`, `src/lib/dal.ts`
- `worker/index.ts`
- `prisma/schema.prisma`
