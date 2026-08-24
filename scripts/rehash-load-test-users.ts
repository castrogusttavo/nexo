import { hash } from 'argon2'
import { prisma } from '@/src/lib/prisma'

const LOAD_TEST_PASSWORD = 'LoadTest@12345678'
const mode = process.argv[2]

const OPTIONS =
  mode === 'old'
    ? { memoryCost: 65536, timeCost: 3, parallelism: 4 }
    : { memoryCost: 19456, timeCost: 2, parallelism: 1 }

async function main() {
  const passwordHash = await hash(LOAD_TEST_PASSWORD, OPTIONS)
  const result = await prisma.account.updateMany({
    where: { user: { email: { startsWith: 'loadtest-onboarded-' } } },
    data: { password: passwordHash },
  })
  console.log(`mode=${mode} options=${JSON.stringify(OPTIONS)} updated=${result.count}`)
}

main().finally(() => prisma.$disconnect())
