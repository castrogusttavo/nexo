import { describe, expect, it } from 'vitest'
import { createAuthenticatedUser } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const defaultHeaders = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

describe('GET /api/users/me/preferences (e2e)', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      headers: { Origin: BASE_URL },
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should lazily return defaults on first read', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      headers: { Cookie: cookie, Origin: BASE_URL },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.theme).toBe('SYSTEM')
    expect(body.data.timezone).toBe('UTC')
    expect(body.data.weekStartsOn).toBe(1)
    expect(body.data.weekendDays).toEqual([0, 6])
  })

  it('should mirror the theme onto a cookie', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      headers: { Cookie: cookie, Origin: BASE_URL },
    })

    expect(res.headers.get('set-cookie')).toContain('nexo.theme=SYSTEM')
  })
})

describe('PATCH /api/users/me/preferences', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ theme: 'DARK' }),
    })

    expect(res.status).toBe(401)
  })

  it('should update and persist preferences', async () => {
    const { cookie } = await createAuthenticatedUser()

    const patchRes = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({
        theme: 'DARK',
        smoothCursor: true,
        quickSendShortcut: 'CTRL_ENTER',
        timezone: 'America/Sao_Paulo',
        weekStartsOn: 0,
        weekendDays: [5, 6],
      }),
    })

    expect(patchRes.status).toBe(200)
    const patchBody = await patchRes.json()
    expect(patchBody.success).toBe(true)
    expect(patchBody.data.theme).toBe('DARK')
    expect(patchBody.data.smoothCursor).toBe(true)
    expect(patchBody.data.quickSendShortcut).toBe('CTRL_ENTER')
    expect(patchBody.data.timezone).toBe('America/Sao_Paulo')
    expect(patchBody.data.weekStartsOn).toBe(0)
    expect(patchBody.data.weekendDays).toEqual([5, 6])

    // Persisted across reads
    const getRes = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      headers: { Cookie: cookie, Origin: BASE_URL },
    })
    const getBody = await getRes.json()
    expect(getBody.data.theme).toBe('DARK')
    expect(getBody.data.timezone).toBe('America/Sao_Paulo')
  })

  it('should support partial updates without touching other fields', async () => {
    const { cookie } = await createAuthenticatedUser()

    await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ theme: 'DARK' }),
    })

    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ smoothCursor: true }),
    })

    const body = await res.json()
    expect(body.data.theme).toBe('DARK') // preserved
    expect(body.data.smoothCursor).toBe(true)
  })

  it('should return 422 for an invalid timezone', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ timezone: 'Not/AZone' }),
    })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 422 for an empty payload', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(422)
  })

  it('should return 422 when weekendDays contains an out-of-range day', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ weekendDays: [7] }),
    })

    expect(res.status).toBe(422)
  })
})
