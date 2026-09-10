import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import {
  DATABASE_URL,
  DATABASE_URL_POOLED,
  DB_POOL_MAX,
} from '@/lib/env/_server'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Pool configurable via env so we can compare scaling curves without
// a rebuild — see k6/stress-issues.js (finding: 5 connections collapses past
// ~100 concurrent users on /issues). Default raised from 5 to 25 after
// Round 5 (k6/EXPERIMENT-LOG.md): production never had DB_POOL_MAX set in
// .env, so it fell back to this default — a real bottleneck hidden
// behind argon2's CPU cost under concurrent login. Pinned in code (not
// just in .env) to survive any deploy that regenerates .env from
// secrets/production.enc.env, which never had this key.

// PgBouncer (transaction pooling) is optional — without DATABASE_URL_POOLED,
// the runtime keeps hitting Postgres directly, identical behavior to
// today. Migrations never go through here (prisma.config.ts uses the
// raw DATABASE_URL) — DDL/advisory locks don't survive transaction mode.
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
