# ADR-002: Redis Sentinel over Cluster

**Status:** Accepted
**Date:** 2026-03-15

## Context

Redis ran as a single instance. A process crash meant cache was unavailable until manual restart. We needed high availability for Redis.

Three options considered:

1. **Single instance** (status quo) — no HA
2. **Redis Sentinel** — master/replica with automatic failover
3. **Redis Cluster** — sharded, multi-master

## Decision

**Redis Sentinel** with Bitnami images: 1 master, 1 replica, 3 sentinels.

### Why not Cluster?

Redis is used exclusively for cache-aside (user profiles, 15min TTL). There is no sharding need — all data fits comfortably in a single master. Cluster adds operational complexity (hash slots, resharding, multi-key restrictions) without benefit.

### Why Bitnami?

Replication and Sentinel are configured entirely via environment variables — no custom `.conf` files needed. Works well with Docker Compose.

### Topology

```
nexo-redis-master   (bitnami/redis)      — primary, accepts writes
nexo-redis-replica  (bitnami/redis)      — read replica, promoted on failover
nexo-sentinel-1     (bitnami/redis-sentinel) — monitors + quorum
nexo-sentinel-2     (bitnami/redis-sentinel)
nexo-sentinel-3     (bitnami/redis-sentinel)
```

### Application client

`src/lib/redis.ts` supports dual mode:
- `REDIS_SENTINEL_HOSTS` set → `createSentinel()` from `redis@5`
- Otherwise → `createClient()` with `REDIS_URL` (local dev)

The `ensureRedisConnected()` interface is unchanged — cache code needs no modifications.

## Consequences

### Positive

- Automatic failover on master crash (~5-10s detection + promotion)
- Zero application code changes — same `ensureRedisConnected()` API
- Local dev stays simple — single Redis via `REDIS_URL`

### Negative

- 5 containers instead of 1 — higher memory footprint (~50MB total)
- Single host = no protection against host failure (acceptable — Redis is cache only, app degrades gracefully to DB)
- Sentinel master name defaults to `mymaster` in Bitnami images regardless of `REDIS_SENTINEL_MASTER_NAME` env var

### Risks

- If all sentinels lose quorum simultaneously, failover won't trigger. Mitigated by 3 sentinels with quorum of 2.
