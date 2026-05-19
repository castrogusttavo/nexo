import { afterAll, describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { closeQueues, getDataExportQueue } from '@/src/lib/queue/queues'

const defaultHeaders = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

async function createAuthenticatedUser(overrides?: {
  name?: string
  email?: string
}) {
  const name = overrides?.name ?? 'Export E2E User'
  const email =
    overrides?.email ??
    `export-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const password = 'Test@12345678'

  const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ name, email, password }),
  })

  if (!signUpRes.ok) {
    throw new Error(
      `Sign-up failed: ${signUpRes.status} ${await signUpRes.text()}`,
    )
  }

  const setCookie = signUpRes.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error('No session cookie returned from sign-up')
  }

  return { name, email, cookie: setCookie }
}

describe('POST /api/users/me/export', () => {
  afterAll(async () => {
    await closeQueues()
  })

  it('returns 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/export`, {
      method: 'POST',
      headers: defaultHeaders,
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 202 with requestedAt and enqueues an export-user-data job', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/export`, {
      method: 'POST',
      headers: { ...defaultHeaders, Cookie: cookie },
    })

    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.data.requestedAt).toBe('string')

    const queue = getDataExportQueue()
    const jobs = await queue.getJobs(
      ['waiting', 'delayed', 'active', 'completed'],
      0,
      50,
    )
    expect(jobs.some((j) => j.name === 'export-user-data')).toBe(true)
  })

  it('rate-limits a second request within 24h for the same user (429)', async () => {
    const { cookie } = await createAuthenticatedUser()

    const first = await fetch(`${BASE_URL}/api/users/me/export`, {
      method: 'POST',
      headers: { ...defaultHeaders, Cookie: cookie },
    })
    expect(first.status).toBe(202)

    const second = await fetch(`${BASE_URL}/api/users/me/export`, {
      method: 'POST',
      headers: { ...defaultHeaders, Cookie: cookie },
    })
    expect(second.status).toBe(429)
    const body = await second.json()
    expect(body.success).toBe(false)
  })

  it('rate limit is scoped per user — a different user is not blocked', async () => {
    const userA = await createAuthenticatedUser()
    const userB = await createAuthenticatedUser()

    const resA = await fetch(`${BASE_URL}/api/users/me/export`, {
      method: 'POST',
      headers: { ...defaultHeaders, Cookie: userA.cookie },
    })
    expect(resA.status).toBe(202)

    const resB = await fetch(`${BASE_URL}/api/users/me/export`, {
      method: 'POST',
      headers: { ...defaultHeaders, Cookie: userB.cookie },
    })
    expect(resB.status).toBe(202)
  })
})
