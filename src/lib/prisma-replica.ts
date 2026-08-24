import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { DATABASE_URL_REPLICA } from '@/lib/env/_server'
import { prisma } from './prisma'

// Singleton preguiçoso, mesmo estilo de getQueueConnection()
// (src/lib/queue/connection.ts). Sem DATABASE_URL_REPLICA, cai de volta
// pro client primário — leitura sem réplica configurada continua exatamente
// como hoje.
let replica: PrismaClient | null = null

export function getPrismaReplica(): PrismaClient {
  if (!DATABASE_URL_REPLICA) return prisma
  if (replica) return replica

  const adapter = new PrismaPg({ connectionString: DATABASE_URL_REPLICA })
  replica = new PrismaClient({ adapter })
  return replica
}
