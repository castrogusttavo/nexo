import { afterAll, afterEach } from 'vitest'
import { prisma } from '@/src/lib/prisma'

export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

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
})
