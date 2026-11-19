# 0004. No `'use cache'` for data that changes at runtime

- Status: Accepted
- Date: 2026-10-17
- Commits: `a0227ae5` (DAL on `use cache: private`, 2026-10-17); `24e609b1` (run seven app instances, 2026-10-25). The paragraph in `CLAUDE.md` ("Do not reach for `'use cache'` on data that changes at runtime...") first appears in git history in `42bc710f` (2026-11-19), which re-tracked `CLAUDE.md` after it had been dropped from the repository on 2026-05-14 (`6fdd2f18`); the file's intermediate edits were not versioned, so the original wording date is not recoverable.

## Context

`cacheComponents` and `partialPrefetching` are on, and the framework validates instant navigation on every page in `next dev`. `'use cache'` is the tempting tool for fast pages. But production runs several app instances (CLAUDE.md says five; `24e609b1` raised it to seven, so CLAUDE.md may be stale), each with its own in-process cache. `updateTag` invalidates only the instance that handled the request, so a cached value that changes at runtime is stale on the other instances.

## Decision

Do not use `'use cache'` for data that changes at runtime. Instead:

- A page renders its heading synchronously and reads `params`, the session or data inside an async component under `<Suspense>` (`PageSkeleton`, `ContextSidebarSkeleton`). Layouts stay synchronous and stream their data-bound parts.
- Per-user, request-time reads use `use cache: private` (see [ADR-0003](0003-dal-instead-of-layout-gates.md)), where only the client router holds the result.
- Never read the clock (`Date.now()`) after a private cache in a server component: it lands in the prefetched shell, where it is refused. Decide it in a client component, after hydration (`useHydrated`; see `HeaderTrialBanner`).
- Opt out with `export const instant = false` and a comment only where blocking is the point: the admin area, redirect-only pages, and public pages whose content is the record itself (an unknown id must answer a real 404). `34c77193` (2026-09-28) applied this to `/` and the workspace layout.

## Consequences

- Reads hit the database or Redis on each request instead of an in-process cache; performance comes from streaming and Redis read-through caches in `src/cache/`, which are shared across instances.
- Correctness does not depend on which instance serves a request.
- Instant-navigation validation can complain in development; each complaint is either fixed or explicitly opted out with a comment.

## Alternatives considered

- `'use cache'` with `updateTag` invalidation: rejected because invalidation reaches one instance only (reasoning from `CLAUDE.md`; no commit message records a failed attempt).
- A shared cache handler across instances (inferred, not evaluated in history).

Related: [caching](../architecture/caching.md), [infrastructure](../architecture/infrastructure.md).
