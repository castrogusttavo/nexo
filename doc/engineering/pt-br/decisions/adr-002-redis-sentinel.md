# ADR-002: Redis Sentinel ao Invés de Cluster

**Status:** Aceito
**Data:** 2026-03-15

## Contexto

O Redis rodava como uma instância única. Uma falha no processo significava que o cache ficava indisponível até reinício manual. Precisávamos de alta disponibilidade para o Redis.

Três opções consideradas:

1. **Instância única** (status quo) — sem HA
2. **Redis Sentinel** — master/réplica com failover automático
3. **Redis Cluster** — sharded, multi-master

## Decisão

**Redis Sentinel** com imagens Bitnami: 1 master, 1 réplica, 3 sentinels.

### Por que não Cluster?

Redis é usado exclusivamente para cache-aside (perfis de usuário, TTL de 15min). Não há necessidade de sharding — todos os dados cabem confortavelmente em um único master. Cluster adiciona complexidade operacional (hash slots, resharding, restrições de multi-key) sem benefício.

### Por que Bitnami?

Replicação e Sentinel são configurados inteiramente via variáveis de ambiente — sem arquivos `.conf` customizados necessários. Funciona bem com Docker Compose.

### Topologia

```
nexo-redis-master   (bitnami/redis)          — primário, aceita escritas
nexo-redis-replica  (bitnami/redis)          — réplica de leitura, promovida em failover
nexo-sentinel-1     (bitnami/redis-sentinel) — monitora + quorum
nexo-sentinel-2     (bitnami/redis-sentinel)
nexo-sentinel-3     (bitnami/redis-sentinel)
```

### Client da aplicação

`src/lib/redis.ts` suporta modo duplo:
- `REDIS_SENTINEL_HOSTS` definido → `createSentinel()` do `redis@5`
- Caso contrário → `createClient()` com `REDIS_URL` (dev local)

A interface `ensureRedisConnected()` permanece inalterada — código de cache não precisa de modificações.

## Consequências

### Positivas

- Failover automático em crash do master (~5-10s detecção + promoção)
- Zero mudanças no código da aplicação — mesma API `ensureRedisConnected()`
- Dev local permanece simples — Redis único via `REDIS_URL`

### Negativas

- 5 containers ao invés de 1 — maior consumo de memória (~50MB total)
- Host único = sem proteção contra falha do host (aceitável — Redis é apenas cache, app degrada graciosamente para o DB)
- Nome do master no Sentinel padrão é `mymaster` nas imagens Bitnami independente da env var `REDIS_SENTINEL_MASTER_NAME`

### Riscos

- Se todos os sentinels perderem quorum simultaneamente, failover não será acionado. Mitigado por 3 sentinels com quorum de 2.
