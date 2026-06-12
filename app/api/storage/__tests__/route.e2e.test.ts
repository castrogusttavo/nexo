import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  defaultHeaders,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

// STR-96: POST /api/storage/upload was unauthenticated scaffold (anonymous
// upload to object storage). It was removed. These tests guard against it
// coming back without going through the auth gate.
describe('POST /api/storage/upload (removed — STR-96)', () => {
  it('should reject anonymous requests with 401 at the proxy (no session cookie)', async () => {
    const res = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ filename: 'evil.md', content: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('should not exist even for an authenticated user (404, route removed)', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: { ...defaultHeaders, Cookie: cookie },
      body: JSON.stringify({ filename: 'evil.md', content: 'x' }),
    })
    expect(res.status).toBe(404)
  })
})
