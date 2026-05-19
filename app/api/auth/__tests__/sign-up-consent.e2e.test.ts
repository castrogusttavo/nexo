import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { defaultHeaders } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

function uniqueClientIp(): string {
  return Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 200) + 10,
  ).join('.')
}

async function signUp(body: Record<string, unknown>) {
  return fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { ...defaultHeaders, 'x-forwarded-for': uniqueClientIp() },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/sign-up/email — consent capture', () => {
  it('persists acceptedTermsAt/PrivacyAt and writes two ConsentEvent(GRANTED) rows', async () => {
    const email = `e2e-${createId()}@example.com`
    const now = new Date()

    const res = await signUp({
      name: 'Consent User',
      email,
      password: 'Test@12345678',
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
    })
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user).not.toBeNull()
    expect(user?.acceptedTermsAt).not.toBeNull()
    expect(user?.acceptedPrivacyAt).not.toBeNull()

    const events = await prisma.consentEvent.findMany({
      where: { userId: user?.id },
      orderBy: { document: 'asc' },
    })
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.document).sort()).toEqual(['PRIVACY', 'TERMS'])
    expect(events.every((e) => e.action === 'GRANTED')).toBe(true)
    const versions = Object.fromEntries(
      events.map((e) => [e.document, e.version]),
    )
    expect(versions.TERMS).toBe(TERMS_VERSION)
    expect(versions.PRIVACY).toBe(PRIVACY_VERSION)
  })

  it('overrides a tampered client timestamp with the server clock', async () => {
    const email = `e2e-${createId()}@example.com`
    const tampered = new Date('1990-01-01T00:00:00.000Z')

    const res = await signUp({
      name: 'Tampered User',
      email,
      password: 'Test@12345678',
      acceptedTermsAt: tampered,
      acceptedPrivacyAt: tampered,
    })
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { email } })
    const acceptedAt = user?.acceptedTermsAt?.getTime() ?? 0
    // Server clock should be within a few seconds of "now", definitely
    // not 1990 — proves the before-hook overwrote the body value.
    expect(Date.now() - acceptedAt).toBeLessThan(60_000)
  })

  it('leaves consent columns null when the body omits the fields (curl bypass)', async () => {
    const email = `e2e-${createId()}@example.com`

    const res = await signUp({
      name: 'Bypass User',
      email,
      password: 'Test@12345678',
    })
    expect(res.status).toBe(200)

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user?.acceptedTermsAt).toBeNull()
    expect(user?.acceptedPrivacyAt).toBeNull()

    const events = await prisma.consentEvent.count({
      where: { userId: user?.id },
    })
    expect(events).toBe(0)
    // The (private)/layout.tsx will catch this user on first access by
    // redirecting them to /onboarding/consent. That redirect is HTML and
    // not exercised here — covered manually + in a future page-level
    // E2E if/when we have a browser harness.
  })
})
