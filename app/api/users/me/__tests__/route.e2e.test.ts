import { describe, expect, it } from 'vitest'
import { createAuthenticatedUser } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const defaultHeaders = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

describe('GET /api/users/me', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me`, {
      headers: { Origin: BASE_URL },
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 200 with user profile when authenticated', async () => {
    const { name, email, cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me`, {
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

describe('PATCH /api/users/me', () => {
  it('should return 401 without authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ name: 'Hacker' }),
    })

    expect(res.status).toBe(401)
  })

  it('should update name successfully', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ name: 'Updated Name' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Updated Name')
  })

  // These two used to assert the endpoint's own e-mail validation and its
  // conflict on an address in use. The field no longer reaches the service, so
  // what matters now is that neither shape can touch the address: a malformed
  // one is not an error to report, and someone else's is not a conflict to
  // lose — both are simply ignored.
  it('should ignore a malformed email instead of failing the update', async () => {
    const { email, cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ name: 'Nome novo', email: 'not-an-email' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe(email)
  })

  it("should leave another account's address untouched", async () => {
    const [{ email: takenEmail }, { email, cookie }] = await Promise.all([
      createAuthenticatedUser({
        email: `taken-${Date.now()}@example.com`,
      }),
      createAuthenticatedUser(),
    ])

    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ email: takenEmail }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe(email)
  })
})

// The profile endpoint used to accept an `email` and write it to the row with
// the old address's verification flag intact. Since the platform admin list is
// keyed by e-mail, any signed-in user could take an unregistered allowlisted
// address, enable 2FA on their own account, and walk into the admin area —
// three requests, no verification anywhere. The field is gone; these keep it
// gone.
describe('PATCH /api/users/me — identity fields', () => {
  const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAILS?.split(',')[0] ?? ''

  it('should ignore an email in the payload', async () => {
    const { email, cookie } = await createAuthenticatedUser()

    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ name: 'Nome novo', email: ADMIN_EMAIL }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Nome novo')
    expect(body.data.email).toBe(email)
  })

  it('should not open the admin area to whoever asks for the admin address', async () => {
    const { cookie } = await createAuthenticatedUser()

    await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    })

    const admin = await fetch(`${BASE_URL}/api/admin/careers`, {
      headers: { ...defaultHeaders, Cookie: cookie },
    })

    expect(admin.status).toBe(403)
  })
})
