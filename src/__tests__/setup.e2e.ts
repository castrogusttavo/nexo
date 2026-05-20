import { afterAll, afterEach, beforeEach } from 'vitest'
import { prisma } from '@/src/lib/prisma'
import { ensureRedisConnected, redis } from '@/src/lib/redis'

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

// Rate-limit counters live in Redis under the rl:* prefixes and are NOT cleared
// by the table truncation below. The dedicated rate-limit spec deliberately
// trips the per-IP auth block, after which every later sign-up from the same IP
// (all of them, in CI) gets 429. Reset the counters before each test so the
// suite is independent of order and timing.
beforeEach(async () => {
  await ensureRedisConnected()
  const keys = await redis.keys('rl:*')
  if (keys.length > 0) await redis.del(keys)
})

afterEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      sessions, accounts, verifications,
      subscriptions, memberships, workspaces,
      consent_events, users,
      incident_updates, incidents,
      health_checks, component_dailies
    CASCADE
  `)
})

afterAll(async () => {
  await prisma.$disconnect()
  if (redis.isOpen) await redis.quit()
})
