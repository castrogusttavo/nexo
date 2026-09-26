import { describe, expect, it } from 'vitest'
import { createAuthenticatedUser, getJson } from '@/src/__tests__/helpers/e2e'

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAILS?.split(',')[0] ?? ''

// The queue dashboard is a route handler, so the admin layout never runs for
// it and every gate it has is the one written into the handler itself. These
// cases are what keeps that copy honest.
describe('GET /admin/queues', () => {
  it('should send an anonymous visitor to sign-in', async () => {
    const res = await getJson('/admin/queues')

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/sign-in')
  })

  // Not 403: a logged-in stranger should not learn that the route exists.
  it('should answer 404 for a signed-in non-admin', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await getJson('/admin/queues', cookie)

    expect(res.status).toBe(404)
  })

  it('should demand a second factor from an allowlisted admin', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })

    const res = await getJson('/admin/queues', cookie)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('ADMIN_TWO_FACTOR_REQUIRED')
  })

  // Session plus second factor gets you to the door; the workbench's own
  // basic auth is the second lock on the destructive actions behind it.
  it('should still challenge for basic auth once the session checks out', async () => {
    const { cookie } = await createAuthenticatedUser({
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    })

    const res = await getJson('/admin/queues', cookie)

    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('Basic')
  })

  it('should serve the dashboard with both locks satisfied', async () => {
    const { cookie } = await createAuthenticatedUser({
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    })
    const basic = Buffer.from(
      `${process.env.WORKBENCH_USER}:${process.env.WORKBENCH_PASS}`,
    ).toString('base64')

    const res = await getJson('/admin/queues/api/queues', {
      cookie,
      extraHeaders: { Authorization: `Basic ${basic}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    const queues = (body.data ?? body) as { name: string }[]
    // Listed explicitly from QueueName, never auto-discovered: passing only
    // `redis` builds a core with no queues at all, which is how the dashboard
    // came up empty while jobs were being scheduled.
    expect(queues.map((q) => q.name).sort()).toEqual([
      'account-lifecycle',
      'data-export',
      'data-retention',
      'trial-lifecycle',
    ])
  })
})
