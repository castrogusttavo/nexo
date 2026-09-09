import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  deleteJson,
} from '@/src/__tests__/helpers/e2e'

describe('DELETE /api/users/me/deletion', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await deleteJson('/api/users/me/deletion')
    expect(res.status).toBe(401)
  })

  it('should return canceled: false when no deletion is scheduled', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await deleteJson('/api/users/me/deletion', cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.canceled).toBe(false)
  })

  it('should cancel a previously scheduled account deletion', async () => {
    const { cookie } = await createAuthenticatedUser()

    const scheduleRes = await deleteJson('/api/users/me', cookie)
    expect(scheduleRes.status).toBe(202)

    const res = await deleteJson('/api/users/me/deletion', cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.canceled).toBe(true)
  })
})
