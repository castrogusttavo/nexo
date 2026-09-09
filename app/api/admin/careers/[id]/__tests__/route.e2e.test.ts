import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedCareerJob } from '@/src/__tests__/factories/career-job.factory'
import {
  createAuthenticatedUser,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAILS?.split(',')[0] ?? ''

describe('GET /api/admin/careers/[id]', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson(`/api/admin/careers/${createId()}`)
    expect(res.status).toBe(401)
  })

  it('should return 403 for an authenticated non-admin user', async () => {
    const { cookie } = await createAuthenticatedUser()
    const job = await seedCareerJob()

    const res = await getJson(`/api/admin/careers/${job.id}`, cookie)
    expect(res.status).toBe(403)
  })

  it('should return 404 for an unknown id, as a platform admin', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })

    const res = await getJson(`/api/admin/careers/${createId()}`, cookie)
    expect(res.status).toBe(404)
  })

  it('should return the career job for a platform admin', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })
    const job = await seedCareerJob({ title: 'Staff Engineer' })

    const res = await getJson(`/api/admin/careers/${job.id}`, cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.title).toBe('Staff Engineer')
  })
})

describe('PATCH /api/admin/careers/[id]', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await patchJson(`/api/admin/careers/${createId()}`, {
      title: 'x',
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 for an authenticated non-admin user', async () => {
    const { cookie } = await createAuthenticatedUser()
    const job = await seedCareerJob()

    const res = await patchJson(
      `/api/admin/careers/${job.id}`,
      { title: 'Hacked Title' },
      cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should update the career job for a platform admin', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })
    const job = await seedCareerJob({ title: 'Old Title' })

    const res = await patchJson(
      `/api/admin/careers/${job.id}`,
      { title: 'New Title' },
      cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.title).toBe('New Title')
  })
})
