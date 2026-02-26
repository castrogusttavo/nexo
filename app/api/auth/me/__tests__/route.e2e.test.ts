import { describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const defaultHeaders = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

async function createAuthenticatedUser(overrides?: {
  name?: string
  email?: string
}) {
  const name = overrides?.name ?? 'E2E User'
  const email = overrides?.email ?? `e2e-${Date.now()}@example.com`
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

describe('GET /api/auth/me', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Origin: BASE_URL },
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 200 with user profile when authenticated', async () => {
    const { name, email, cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookie, Origin: BASE_URL },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe(name)
    expect(body.data.email).toBe(email)
    expect(body.data.id).toBeDefined()
    expect(body.data.createdAt).toBeDefined()
  })
})

describe('PATCH /api/auth/me', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ name: 'Hacker' }),
    })

    expect(res.status).toBe(401)
  })

  it('should update name successfully', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ name: 'Updated Name' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Updated Name')
  })

  it('should return 422 for invalid email', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ email: 'not-an-email' }),
    })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 409 when email is already taken', async () => {
    const { email: takenEmail } = await createAuthenticatedUser({
      email: `taken-${Date.now()}@example.com`,
    })
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ email: takenEmail }),
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
