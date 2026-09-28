import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Tests, CI and the Docker build all set SKIP_ENV_VALIDATION (or run with
// NODE_ENV=test), and that path used to hand `process.env` over untouched.
// Untouched means unconverted: every value stayed a string, so the booleans
// were true whatever they said. `REDIS_TLS_ENABLED=false` switched TLS on and
// the Redis client refused the plain `redis://` URL with "tls socket option is
// set to true which is mismatch with protocol" — a build failure that reads
// like a broken URL, not like a boolean that never got parsed.

const BASE = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
}

async function importFresh() {
  vi.resetModules()
  return import('@/lib/env/_server')
}

beforeEach(() => {
  vi.stubEnv('SKIP_ENV_VALIDATION', 'true')
  for (const [k, v] of Object.entries(BASE)) vi.stubEnv(k, v)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('server env, validation skipped', () => {
  it('reads "false" as false, not as a truthy string', async () => {
    vi.stubEnv('REDIS_TLS_ENABLED', 'false')

    const { REDIS_TLS_ENABLED } = await importFresh()

    expect(REDIS_TLS_ENABLED).toBe(false)
  })

  it('still reads "true" as true', async () => {
    vi.stubEnv('REDIS_TLS_ENABLED', 'true')

    const { REDIS_TLS_ENABLED } = await importFresh()

    expect(REDIS_TLS_ENABLED).toBe(true)
  })

  it('converts the numeric knobs instead of leaving them as strings', async () => {
    vi.stubEnv('DB_POOL_MAX', '7')

    const { DB_POOL_MAX } = await importFresh()

    expect(DB_POOL_MAX).toBe(7)
  })

  // The hatch has to stay open: this is the path builds take precisely
  // because they have no real credentials to offer.
  it('does not demand the variables it cannot have', async () => {
    for (const key of Object.keys(BASE)) vi.stubEnv(key, '')

    await expect(importFresh()).resolves.toBeDefined()
  })

  // A throwaway .env with a malformed value must not take the process down
  // either — the fallback hands the raw environment back.
  it('survives a value that would fail validation', async () => {
    vi.stubEnv('DATABASE_URL', 'not-a-url')

    await expect(importFresh()).resolves.toBeDefined()
  })
})
