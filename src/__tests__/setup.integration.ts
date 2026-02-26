import { afterAll, afterEach } from 'vitest'
import { prisma } from '@/src/lib/prisma'

afterEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE sessions, accounts, verifications, users, workspaces CASCADE
  `)
})

afterAll(async () => {
  await prisma.$disconnect()
})
