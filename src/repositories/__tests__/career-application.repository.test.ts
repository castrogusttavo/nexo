import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedCareerApplication } from '@/src/__tests__/factories/career-application.factory'
import { seedCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { CareerApplicationRepository } from '../career-application.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CareerApplicationRepository', () => {
  describe('create()', () => {
    it('should persist an application bound to a job', async () => {
      const job = await seedCareerJob()

      const result = await CareerApplicationRepository.create({
        jobId: job.id,
        name: 'Ana Silva',
        email: 'ana@example.com',
        phone: null,
        linkedinUrl: null,
        portfolioUrl: null,
        lastJobTitle: null,
        experienceYears: null,
        message: null,
        resumeBucket: 'career-applications',
        resumeKey: 'key.pdf',
        resumeFileName: 'curriculo.pdf',
        consentAt: new Date(),
        ipAddress: '127.0.0.1',
      })

      const application = expectOk(result)
      expect(application.jobId).toBe(job.id)
      expect(application.status).toBe('RECEIVED')
    })
  })

  describe('listByJob()', () => {
    it('should list applications for a job ordered by createdAt desc', async () => {
      const job = await seedCareerJob()
      const older = await seedCareerApplication(job.id, { name: 'Older' })
      await new Promise((r) => setTimeout(r, 5))
      const newer = await seedCareerApplication(job.id, { name: 'Newer' })

      const result = await CareerApplicationRepository.listByJob(job.id)

      const list = expectOk(result)
      expect(list.map((a) => a.id)).toEqual([newer.id, older.id])
    })

    it('should not return applications from other jobs', async () => {
      const [jobA, jobB] = await Promise.all([seedCareerJob(), seedCareerJob()])
      await seedCareerApplication(jobA.id, { name: 'A' })
      await seedCareerApplication(jobB.id, { name: 'B' })

      const result = await CareerApplicationRepository.listByJob(jobA.id)

      const list = expectOk(result)
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('A')
    })
  })

  describe('query failures', () => {
    it('create() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.careerApplication, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await CareerApplicationRepository.create({
        jobId: 'job-1',
        name: 'Ana',
        email: 'ana@example.com',
        phone: null,
        linkedinUrl: null,
        portfolioUrl: null,
        lastJobTitle: null,
        experienceYears: null,
        message: null,
        resumeBucket: 'career-applications',
        resumeKey: 'key.pdf',
        resumeFileName: 'curriculo.pdf',
        consentAt: new Date(),
        ipAddress: '127.0.0.1',
      })

      expectErr(result, 'DATABASE_ERROR')
    })

    it('listByJob() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.careerApplication, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )

      const result = await CareerApplicationRepository.listByJob('job-1')

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
