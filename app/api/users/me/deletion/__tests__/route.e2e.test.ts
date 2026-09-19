import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  deleteJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

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
    // Scheduling via DELETE /api/users/me revokes every session, and signing
    // back in auto-cancels the schedule (session.create hook in lib/auth), so
    // the schedule is seeded directly to reach this endpoint with it pending.
    const { id, cookie } = await createAuthenticatedUser()
    await prisma.user.update({
      where: { id },
      data: { deletionScheduledAt: new Date(Date.now() + 86_400_000) },
    })

    const res = await deleteJson('/api/users/me/deletion', cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.canceled).toBe(true)

    const user = await prisma.user.findUnique({ where: { id } })
    expect(user?.deletionScheduledAt).toBeNull()
  })
})
