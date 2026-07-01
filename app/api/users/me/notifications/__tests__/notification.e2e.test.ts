import { describe, expect, it } from 'vitest'
import { createAuthenticatedUser } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const defaultHeaders = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

describe('GET /api/users/me/notifications (e2e)', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      headers: { Origin: BASE_URL },
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should lazily return default on first read', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      headers: { Cookie: cookie, Origin: BASE_URL },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.priorityChanges).toBe(true)
    expect(body.data.stateChanges).toBe(true)
    expect(body.data.comments).toBe(true)
    expect(body.data.mentions).toBe(true)
  })
})

describe('PATCH /api/users/me/notifications', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ comments: false }),
    })

    expect(res.status).toBe(401)
  })

  it('should update and persist notification settings', async () => {
    const { cookie } = await createAuthenticatedUser()

    const patchRes = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({
        priorityChanges: false,
        stateChanges: false,
        comments: false,
        mentions: false,
      }),
    })

    expect(patchRes.status).toBe(200)
    const patchBody = await patchRes.json()
    expect(patchBody.success).toBe(true)
    expect(patchBody.data.priorityChanges).toBe(false)
    expect(patchBody.data.stateChanges).toBe(false)
    expect(patchBody.data.comments).toBe(false)
    expect(patchBody.data.mentions).toBe(false)

    // Persisted across reads
    const getRes = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      headers: { Cookie: cookie, Origin: BASE_URL },
    })
    const getBody = await getRes.json()
    expect(getBody.data.priorityChanges).toBe(false)
    expect(getBody.data.mentions).toBe(false)
  })

  it('should support partial updates without touching other fields', async () => {
    const { cookie } = await createAuthenticatedUser()

    await fetch(`${BASE_URL}/api/users/me/notifications`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({
        priorityChanges: false,
        stateChanges: false,
        comments: false,
        mentions: false,
      }),
    })

    const res = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ comments: true }),
    })

    const body = await res.json()
    expect(body.data.comments).toBe(true)
    expect(body.data.mentions).toBe(false) // preserved
    expect(body.data.priorityChanges).toBe(false) // preserved
  })

  it('should return 402 for an empty payload', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 422 for a non-boolean value', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/notifications`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ mentions: 'yes' }),
    })

    expect(res.status).toBe(422)
  })
})
