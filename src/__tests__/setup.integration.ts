import { afterAll, afterEach } from 'vitest'
import { prisma } from '@/src/lib/prisma'

afterEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      sessions, accounts, verifications,
      subscriptions, memberships, workspaces, users,
      incident_updates, incidents,
      health_checks, component_dailies
    CASCADE
  `)
})

afterAll(async () => {
  await prisma.$disconnect()
})
