import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedCareerJob } from '@/src/__tests__/factories/career-job.factory'
import {
  createAuthenticatedUser,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAILS?.split(',')[0] ?? ''

function validJobPayload(overrides?: { slug?: string }) {
  return {
    slug: overrides?.slug ?? `job-${createId().slice(0, 8)}`,
    title: 'Senior Backend Engineer',
    summary: 'Vaga para engenheiro backend sênior, foco em Node e Postgres.',
    content: {
      about: 'Você vai atuar no core do produto, junto ao time de plataforma.',
      responsibilities: ['Manter serviços em produção', 'Revisar PRs'],
      requirements: ['5+ anos com Node.js'],
      stack: ['Node.js', 'PostgreSQL'],
    },
    locationType: 'REMOTE',
    employmentType: 'FULL_TIME',
  }
}

describe('GET /api/admin/careers', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson('/api/admin/careers')
    expect(res.status).toBe(401)
  })

  it('should return 403 for an authenticated non-admin user', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await getJson('/api/admin/careers', cookie)
    expect(res.status).toBe(403)
  })

  // Allowlisted, but with nothing but a password behind the session.
  it('should return 403 for an admin without a second factor', async () => {
    const { cookie } = await createAuthenticatedUser({ email: ADMIN_EMAIL })

    const res = await getJson('/api/admin/careers', cookie)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('ADMIN_TWO_FACTOR_REQUIRED')
  })

  it('should list all career jobs for a platform admin', async () => {
    const { cookie } = await createAuthenticatedUser({
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    })
    await seedCareerJob()

    const res = await getJson('/api/admin/careers', cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
  })
})

describe('POST /api/admin/careers', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson('/api/admin/careers', validJobPayload())
    expect(res.status).toBe(401)
  })

  it('should return 403 for an authenticated non-admin user', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson('/api/admin/careers', validJobPayload(), cookie)
    expect(res.status).toBe(403)
  })

  it('should return 422 for an invalid body', async () => {
    const { cookie } = await createAuthenticatedUser({
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    })
    const res = await postJson('/api/admin/careers', { slug: 'x' }, cookie)
    expect(res.status).toBe(422)
  })

  it('should create a career job as DRAFT for a platform admin', async () => {
    const { cookie } = await createAuthenticatedUser({
      email: ADMIN_EMAIL,
      twoFactorEnabled: true,
    })
    const res = await postJson('/api/admin/careers', validJobPayload(), cookie)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.status).toBe('DRAFT')
  })
})
