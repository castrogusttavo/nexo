# ADR-001: Redis Cache-Aside with DTO Storage

**Status:** Accepted
**Date:** 2026-03-15

## Context

The application needs a caching strategy to reduce database load for frequently accessed data (user profiles, session data). Two questions needed answering:

1. Which caching pattern? (cache-aside, read-through, write-through)
2. What does the cache store? (Prisma models vs DTOs)

## Decision

**Cache-aside pattern** managed by the Service layer, storing **DTOs** (not Prisma models).

- **Read path:** Service checks Redis → hit returns cached DTO → miss queries Repository → Mapper converts to DTO → cache populated → return
- **Write path:** Service calls Repository → on success, invalidate cache → Mapper converts → return
- **TTL:** 15 minutes (aligned with access token lifetime)
- **Storage format:** Serialized DTO via `JSON.stringify`

### Why cache-aside?

The Service layer already orchestrates Repository + Cache, making it the natural owner of cache logic. Read-through/write-through would require a separate caching proxy layer that adds complexity without benefit at our scale.

### Why store DTOs?

- Cache hits skip the Mapper entirely — faster reads
- DTOs are the final shape consumers need — no redundant transformation
- Prisma models may contain sensitive fields (password hashes) that should not be serialized to Redis

## Consequences

### Positive

- Simple implementation — Service calls `Cache.get()` before `Repository.find()`
- Cache hits are fast — no post-processing needed
- Sensitive fields never reach Redis

### Negative

- **DTO shape changes require cache invalidation on deploy** — if a field is added/removed from the DTO, stale cache entries have the old shape
- Cache and Mapper are coupled — changing the DTO means both must be considered

### Mitigation

- TTL of 15 minutes limits staleness window
- Deploy pipeline can flush relevant cache keys when DTO changes are detected (manual step for now)
