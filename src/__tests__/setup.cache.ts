// Force single-instance Redis for local tests (no Sentinel)
delete process.env.REDIS_SENTINEL_HOSTS

const password = process.env.REDIS_PASSWORD || ''
const redisAuth = password ? `:${password}@` : ''
process.env.REDIS_URL = process.env.REDIS_URL || `redis://${redisAuth}localhost:6379`
