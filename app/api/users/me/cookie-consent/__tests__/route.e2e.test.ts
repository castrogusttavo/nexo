import { describe, expect, it } from 'vitest'
import { COOKIES_VERSION } from '@/lib/legal/versions'
import { createAuthenticatedUser, postJson } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

describe('POST /api/users/me/cookie-consent', () => {
  it('returns 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/cookie-consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
      body: JSON.stringify({ accepted: true }),
    })
    expect(res.status).toBe(401)
  })

  it('writes a ConsentEvent(GRANTED) when accepted=true', async () => {
    const { id, cookie } = await createAuthenticatedUser()

    const res = await postJson(
      '/api/users/me/cookie-consent',
      { accepted: true },
      cookie,
    )

    expect(res.status).toBe(200)
    const events = await prisma.consentEvent.findMany({
      where: { userId: id, document: 'COOKIES' },
      orderBy: { createdAt: 'asc' },
    })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      document: 'COOKIES',
      action: 'GRANTED',
      version: COOKIES_VERSION,
    })
  })

  it('writes a ConsentEvent(REVOKED) when accepted=false', async () => {
    const { id, cookie } = await createAuthenticatedUser()

    const res = await postJson(
      '/api/users/me/cookie-consent',
      { accepted: false },
      cookie,
    )

    expect(res.status).toBe(200)
    const events = await prisma.consentEvent.findMany({
      where: { userId: id, document: 'COOKIES' },
    })
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe('REVOKED')
  })

  it('appends a new row per call (no upsert)', async () => {
    const { id, cookie } = await createAuthenticatedUser()

    await postJson('/api/users/me/cookie-consent', { accepted: true }, cookie)
    await postJson('/api/users/me/cookie-consent', { accepted: false }, cookie)
    await postJson('/api/users/me/cookie-consent', { accepted: true }, cookie)

    const events = await prisma.consentEvent.findMany({
      where: { userId: id, document: 'COOKIES' },
      orderBy: { createdAt: 'asc' },
    })
    expect(events.map((e) => e.action)).toEqual([
      'GRANTED',
      'REVOKED',
      'GRANTED',
    ])
  })

  it('returns 422 for invalid body', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/users/me/cookie-consent',
      { accepted: 'maybe' },
      cookie,
    )
    expect(res.status).toBe(422)
  })
})
