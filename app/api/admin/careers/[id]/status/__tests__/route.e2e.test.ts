import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { createAuthenticatedUser, patchJson } from '@/src/__tests__/helpers/e2e'

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAILS?.split(',')[0] ?? ''

describe('PATCH /api/admin/careers/[id]/status', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await patchJson(`/api/admin/careers/${createId()}/status`, {
      status: 'OPEN',
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 for an authenticated non-admin user', async () => {
    const { cookie } = await createAuthenticatedUser()
    const job = await seedCareerJob({ status: 'DRAFT' })

    const res = await patchJson(
      `/api/admin/careers/${job.id}/status`,
      { status: 'OPEN' },
      cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 422 for an invalid status value', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })
    const job = await seedCareerJob({ status: 'DRAFT' })

    const res = await patchJson(
      `/api/admin/careers/${job.id}/status`,
      { status: 'PUBLISHED' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should transition DRAFT to OPEN for a platform admin', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })
    const job = await seedCareerJob({ status: 'DRAFT' })

    const res = await patchJson(
      `/api/admin/careers/${job.id}/status`,
      { status: 'OPEN' },
      cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.status).toBe('OPEN')
  })
})
