import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import {
  DATABASE_URL,
  DATABASE_URL_POOLED,
  DB_POOL_MAX,
} from '@/lib/env/_server'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Pool configurável por env pra dar pra comparar curva de escala sem
// rebuild — ver k6/stress-issues.js (achado: 5 conexões colapsa a partir
// de ~100 usuários simultâneos em /issues). Default subido de 5 pra 25
// depois da Rodada 5 (k6/EXPERIMENT-LOG.md): produção nunca teve
// DB_POOL_MAX setado no .env, então caía nesse default — gargalo real
// escondido atrás do custo de CPU do argon2 em login concorrente. Fixado
// no código (não só no .env) pra sobreviver a qualquer deploy que
// regenere o .env a partir de secrets/production.enc.env, que nunca
// teve essa chave.

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
