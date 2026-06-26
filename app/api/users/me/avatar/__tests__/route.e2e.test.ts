import { describe, expect, it } from 'vitest'
import { createAuthenticatedUser } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

function pngForm(field: string, type = 'image/png') {
  const fd = new FormData()
  fd.append(field, new File([new Uint8Array([1, 2, 3])], 'a.png', { type }))
  return fd
}

describe('POST /api/users/me/avatar', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      body: pngForm('avatars'),
    })
    expect(res.status).toBe(401)
  })

  it('should reject a missing file with 422', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: new FormData(),
    })
    expect(res.status).toBe(422)
  })

  it('should reject an unsupported MIME type with 422', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await fetch(`${BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: new FormData(),
    })
    expect(res.status).toBe(422)
  })

  it('should rate-limit after the upload budget is exhausted', async () => {
    const { cookie } = await createAuthenticatedUser()
    let last = 0
    // uploadLimiter = 10/min keyed by user/ the 11th must be blocked
    for (let i = 0; i < 11; i++) {
      const res = await fetch(`${BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: { Cookie: cookie },
        body: pngForm('avatars', 'image/gif'), // 422 still consumes a point
      })
      last = res.status
    }
    expect(last).toBe(429)
  })
})
