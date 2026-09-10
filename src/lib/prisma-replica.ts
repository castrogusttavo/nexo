import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { DATABASE_URL_REPLICA } from '@/lib/env/_server'
import { prisma } from './prisma'

// Lazy singleton, same style as getQueueConnection()
// (src/lib/queue/connection.ts). Without DATABASE_URL_REPLICA, it falls
// back to the primary client — reads with no replica configured behave
// exactly as they do today.
let replica: PrismaClient | null = null

export function getPrismaReplica(): PrismaClient {
  if (!DATABASE_URL_REPLICA) return prisma
  if (replica) return replica

  const adapter = new PrismaPg({ connectionString: DATABASE_URL_REPLICA })
  replica = new PrismaClient({ adapter })
  return replica
}
