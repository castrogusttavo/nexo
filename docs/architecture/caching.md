# Caching

Nexo has several caches that look alike and answer different questions. This document separates them, says what each one holds and for how long, and explains the rule that keeps runtime data out of `'use cache'`.

## The caches

1. **Redis read-through caches** in `src/cache/`: shared by all app instances, explicit invalidation, short TTLs.
2. **`use cache: private` in the DAL** (`src/lib/dal.ts`): per-request authorization results that the client router may keep for five minutes.
3. **React `cache()`**: per-request memoization (`getAuthSession`, `getProjectContext`, `getWorkspaceMembership`).
4. **Prerendered shell** (Cache Components): the static part of a page, streamed instantly while dynamic parts wait inside `<Suspense>`.
5. **HTTP `Cache-Control`**: `successResponse` accepts optional `cacheOptions` and sets `Cache-Control` only when asked.

## Redis caches

`src/cache/_cache.ts` exports `createKeyedCache<T>({ prefix, ttl, name })`, returning `get`, `set` and `invalidate` over JSON values in Redis (`SET ... EX ttl`). It is intentionally forgiving: every operation is try/catch, a failure is logged as `cache.<name>.<action>_failed` and treated as a miss. Redis being down degrades performance, not correctness.

| Cache | Key prefix | TTL | Used by |
| --- | --- | --- | --- |
| `WorkspaceCache` | `workspace:v5:` | 15 min | `WorkspaceService` |
| `UserCache` | `user:v4:` | 15 min | `WorkspaceService` (invalidation on membership changes) |
| `NotificationSettingCache` | `notif:` | 15 min | `notification-setting.service.ts` |
| `UserPreferenceCache` | `pref:v3:` | 15 min | `user-preference.service.ts` |
| `IssueListCache` | `issues:list:...` | 30 s | `issue.service.ts` |
| `StatusCache` | `status:snapshot:v1` | 30 s | `status/status.service.ts` |

`IssueListCache` and `StatusCache` are hand-written rather than built on `createKeyedCache`. The issue list uses a version counter per project: pages are stored under `issues:list:page:<project>:<version>:<cursor>:<limit>`, and `invalidate(projectId)` just `INCR`s the version key, which orphans every cached page at once without scanning keys. Writers in `issue.service.ts` call it after mutations.

### Read-through shape

A service reads the cache, falls back to the repository, then writes the cache. From `WorkspaceService.getById`:

```ts
const membership = await assertMember(actorId, workspaceId)
if (!membership.ok) return membership
const cached = await WorkspaceCache.get(workspaceId)
if (cached) return ok(cached)
// ...repository read, map to DTO...
await WorkspaceCache.set(workspaceId, dto)
```

The authorization check runs before the cache read, so the cache is never a way around it. See [multi-tenancy.md](./multi-tenancy.md).

### Versioned prefixes

When a cached DTO gains a field, the prefix is bumped (`workspace:v5:`, `user:v4:`). Old entries are not migrated; they expire on their own, and the comments in `workspace.cache.ts` and `user.cache.ts` record why each bump happened. Bump the prefix whenever the cached DTO shape changes, or readers see `undefined` for new fields until the TTL runs out.

## `use cache: private` in the DAL

`getCurrentUser`, `requireConsentedUser` and `requireMembership` use `'use cache: private'` with `cacheLife({ stale: 300 })`. This is not a data cache: per the Next.js docs it runs at request time, is not stored on the server across requests in production, and its `stale` time feeds the client router cache. It exists so authenticated content can join the prefetched shell and navigation stays instant. Cost: after a session or consent revocation, a tab holding the shell can show stale content for up to five minutes. See [auth.md](./auth.md).

## Instant navigation rules

`cacheComponents` and `partialPrefetching` are on (`next.config.ts`), and `next dev` validates instant navigation on every page. The working pattern is a synchronous page heading, with `params`, the session and data read inside an async component under `<Suspense>`; layouts stay synchronous and stream their own data-bound parts (see `app/(private)/[workspace-slug]/layout.tsx`). Do not read the clock (`Date.now()`) after a private cache in a server component; decide it in a client component after hydration. Opting out is `export const instant = false`, reserved for places where blocking is the point.

Two related quirks seen in the code: `getAuthSession` awaits `connection()` so Better Auth's expiry check never runs during a prerender, and `getProjectContext` calls `io()` (from `next/cache`) before its first query because a pooled `pg` connection draws random bytes, which a prerender refuses.

## Key decision: no `'use cache'` for runtime data

Production runs several app instances, each with its own in-process cache, so invalidating with `updateTag` or `revalidateTag` only reaches the instance that handled the write. Data that changes at runtime therefore goes to Redis (shared) with explicit invalidation, not to `'use cache'`. Where `'use cache'` does appear it caches data that is not tenant runtime data: the DAL's private scopes, build-time content readers (`src/lib/changelog.ts`, `src/lib/blog/post.ts`) and the greeting and date helpers on the workspace home page. See [ADR 0004](../adr/0004-no-use-cache-for-runtime-data.md).

## Choosing a mechanism

- Needs to be shared across instances and changes at runtime (workspace settings, issue lists): Redis cache with explicit invalidation, or no cache.
- Answers "may this request see this page": the DAL, never a Redis cache.
- Build-time content (changelog, blog): `'use cache'`.
- Needs request-scoped deduplication only: React `cache()`.

## Invalidation points

- Workspace update: `WorkspaceService.update` invalidates `WorkspaceCache` for the workspace and `UserCache` for every member, because a user entry embeds workspace DTOs.
- Issue writes: `issue.service.ts` calls `IssueListCache.invalidate(project.id)` after mutations (three call sites at the time of writing).
- Status: `StatusCache` entries expire after 30 seconds, and `status.service.ts` calls `StatusCache.invalidate()` at the end of a collection run.

## Gotchas

- Redis cache failures are silent apart from a log line; do not rely on a cache for correctness.
- `createKeyedCache.get` logs a failed read with action `set` (the warn call passes `'set'`), so grep both when debugging `get` failures.
- Invalidate after the write succeeds, and invalidate every key that embeds the data (`UserCache` embeds memberships with workspace DTOs, so workspace changes invalidate user entries too, see `workspace.service.ts`).
- A short TTL (30 s) with no invalidation, as in `StatusCache`, accepts brief staleness by design.

## Related files

- `src/cache/_cache.ts`, `src/cache/*.cache.ts`
- `src/lib/redis.ts`, `src/lib/dal.ts`, `src/lib/auth-session.ts`
- `src/services/workspace.service.ts`, `src/services/issue.service.ts`
- `next.config.ts`
