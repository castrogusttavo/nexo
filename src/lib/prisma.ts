import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { DATABASE_URL } from '@/lib/env/_server'

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
  max: 5,
})

export const prisma = new PrismaClient({
  adapter,
})
