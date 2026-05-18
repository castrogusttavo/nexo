// Force single-instance Redis for local tests (no Sentinel)
delete process.env.REDIS_SENTINEL_HOSTS

// In CI, REDIS_URL is already provided as a plain redis:// URL.
// Only override for local dev, where the Docker Redis listens on the TLS port
// (REDIS_PORT_NUMBER is set to 0 in docker-compose.infra.yml).
if (!process.env.REDIS_URL) {
  const password = process.env.REDIS_PASSWORD || ''
  const redisAuth = password ? `:${password}@` : ''
  process.env.REDIS_URL = `rediss://${redisAuth}localhost:6379`
  process.env.REDIS_TLS_ENABLED = 'true'
}
