import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { DATABASE_URL, DATABASE_URL_POOLED } from '@/lib/env/_server'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Pool configurável por env pra dar pra comparar curva de escala sem
// rebuild — ver k6/stress-issues.js (achado: 5 conexões colapsa a partir
// de ~100 usuários simultâneos em /issues).
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 5)

// PgBouncer (pooling de transação) é opcional — sem DATABASE_URL_POOLED,
// runtime continua batendo direto no Postgres, comportamento idêntico ao
// de hoje. Migrations nunca passam por aqui (prisma.config.ts usa
// DATABASE_URL puro) — DDL/advisory locks não sobrevivem a modo transação.
const DATABASE_URL_RUNTIME = DATABASE_URL_POOLED ?? DATABASE_URL

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: DATABASE_URL_RUNTIME,
    max: DB_POOL_MAX,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
