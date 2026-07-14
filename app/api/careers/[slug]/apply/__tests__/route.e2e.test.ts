import { describe, expect, it } from 'vitest'
import { seedCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

function pdfBlob(content = '%PDF-1.4 fake') {
  return new Blob([content], { type: 'application/pdf' })
}

async function apply(
  slug: string,
  overrides: Record<string, string> = {},
  file: Blob = pdfBlob(),
) {
  const form = new FormData()
  form.set('name', overrides.name ?? 'Ana Silva')
  form.set('email', overrides.email ?? 'ana@example.com')
  form.set('consent', overrides.consent ?? 'true')
  form.set('resume', file ?? 'curriculo.pdf')
  if (overrides.honeypot) form.set('honeypot', overrides.honeypot)

  return fetch(`${BASE_URL}/api/careers/${slug}/apply`, {
    method: 'POST',
    body: form,
  })
}

describe('POST /api/careers/[slug]/apply', () => {
  it('should accept a valid application to an open job (no auth required)', async () => {
    const job = await seedCareerJob({ status: 'OPEN' })

    const res = await apply(job.slug)

    expect(res.status).toBe(201)
  })

  it('should return 404 for an unknown slug', async () => {
    const res = await apply('does-not-exist')

    expect(res.status).toBe(404)
  })

  it('should return 409 for a closed job', async () => {
    const job = await seedCareerJob({ status: 'CLOSED' })

    const res = await apply(job.slug)

    expect(res.status).toBe(409)
  })

  it('should return 422 when consent is missing', async () => {
    const job = await seedCareerJob({ status: 'OPEN' })

    const res = await apply(job.slug, { consent: 'false' })

    expect(res.status).toBe(422)
  })

  it('should return a fake success without persisting when honeypot is filled', async () => {
    const job = await seedCareerJob({ status: 'OPEN' })

    const res = await apply(job.slug, { honeypot: 'i am a bot' })

    expect(res.status).toBe(201)
  })

  it('should reject a non-PDF file', async () => {
    const job = await seedCareerJob({ status: 'OPEN' })
    const textFile = new Blob(['not a pdf'], { type: 'text/plain' })

    const res = await apply(job.slug, {}, textFile)

    expect(res.status).toBe(422)
  })
})
