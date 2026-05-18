// Force single-instance Redis for local tests (no Sentinel)
delete process.env.REDIS_SENTINEL_HOSTS

// Use rediss:// (TLS) since the server only listens on the TLS port
// (REDIS_PORT_NUMBER is set to 0 in docker-compose.infra.yml).
// The checkServerIdentity bypass in redis.ts handles the CN=redis / localhost
// hostname mismatch, so no cert regeneration is needed for local dev.
const password = process.env.REDIS_PASSWORD || ''
const redisAuth = password ? `:${password}@` : ''
process.env.REDIS_URL = `rediss://${redisAuth}localhost:6379`
process.env.REDIS_TLS_ENABLED = 'true'
