import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// The browser specs talk to the same database the app under test uses. Only
// two things are done straight through Prisma, both of which a user cannot do
// from a browser: flipping `emailVerified` for accounts whose OTP e-mail is
// never delivered (MAIL_DRY_RUN), and reading the OTP the app generated.
// Everything else goes through the UI or the app's own HTTP API.

const globalForPrisma = globalThis as unknown as { e2ePrisma?: PrismaClient }

function createClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/postgres'
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const db: PrismaClient = globalForPrisma.e2ePrisma ?? createClient()
globalForPrisma.e2ePrisma = db

/**
 * The OTP better-auth just stored for this e-mail. The verification row's
 * value is `<otp>:<attempts>`.
 */
export async function readEmailOtp(email: string): Promise<string> {
  const row = await db.verification.findFirst({
    where: { identifier: `email-verification-otp-${email}` },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) throw new Error(`No e-mail verification OTP stored for ${email}`)
  const otp = row.value.split(':')[0]
  if (!otp) throw new Error(`Malformed verification value for ${email}`)
  return otp
}

/**
 * Polls for the OTP row until better-auth has written it. Not a blind wait:
 * it returns on the first read that finds the code.
 */
export async function waitForEmailOtp(
  email: string,
  timeoutMs = 15_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const otp = await readEmailOtp(email).catch(() => null)
    if (otp) return otp
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for the OTP of ${email}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

export async function markEmailVerified(email: string): Promise<string> {
  const user = await db.user.update({
    where: { email },
    data: { emailVerified: true },
    select: { id: true },
  })
  return user.id
}

/** Marks onboarding as finished so the account lands straight in a workspace. */
export async function finishOnboarding(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { onboardingStep: null, role: 'DEVELOPER' },
  })
}

/**
 * Drops everything a worker created. The Playwright run gets none of the
 * table truncation the vitest integration project has, so each worker cleans
 * up after itself; failures here never fail the run, the names are unique
 * anyway.
 */
export async function dropAccount(
  userId: string,
  workspaceId: string,
): Promise<void> {
  try {
    // Projects, memberships, invitations and wiki pages cascade from the
    // workspace; sessions, accounts and sticky notes cascade from the user.
    await db.workspace.deleteMany({ where: { id: workspaceId } })
    await db.user.deleteMany({ where: { id: userId } })
  } catch {
    // Leftovers are harmless: every name carries a per-run suffix.
  }
}
