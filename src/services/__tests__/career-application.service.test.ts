import { describe, expect, it, vi } from 'vitest'

vi.mock('@/src/repositories/career-job.repository')
vi.mock('@/src/repositories/career-application.repository')
vi.mock('@/src/services/career/_resume')
vi.mock('@/src/lib/storage/s3')
vi.mock('@/src/lib/mail/careers/send-career-application')

import { createFakeCareerApplication } from '@/src/__tests__/factories/career-application.factory'
import { createFakeCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError, validationError } from '@/src/errors'
import { sendCareerApplicationEmail } from '@/src/lib/mail/careers/send-career-application'
import { err, ok } from '@/src/lib/result'
import { getPresignedDownloadUrl } from '@/src/lib/storage/s3'
import { CareerApplicationRepository } from '@/src/repositories/career-application.repository'
import { CareerJobRepository } from '@/src/repositories/career-job.repository'
import { persistResume, validateResume } from '@/src/services/career/_resume'
import { CareerApplicationService } from '../career-application.service'

const mockedJobRepo = vi.mocked(CareerJobRepository)
const mockedAppRepo = vi.mocked(CareerApplicationRepository)
const mockedValidateResume = vi.mocked(validateResume)
const mockedPersistResume = vi.mocked(persistResume)
const mockedGetPresignedUrl = vi.mocked(getPresignedDownloadUrl)
const mockedSendEmail = vi.mocked(sendCareerApplicationEmail)

const dto = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  consent: true as const,
}

const resumeFile = {
  buffer: Buffer.from('%PDF-1.4 fake'),
  contentType: 'application/pdf',
  fileName: 'curriculo.pdf',
}

describe('CareerApplicationService', () => {
  describe('submit()', () => {
    it('should submit an application to an open job', async () => {
      const job = createFakeCareerJob({ id: 'job-1', status: 'OPEN' })
      mockedJobRepo.findBySlug.mockResolvedValue(ok(job))
      mockedValidateResume.mockReturnValue(ok(undefined))
      mockedPersistResume.mockResolvedValue(ok(undefined))
      mockedAppRepo.create.mockResolvedValue(
        ok(createFakeCareerApplication({ id: 'app-1', jobId: 'job-1' })),
      )
      mockedGetPresignedUrl.mockResolvedValue('https://minio.test/resume.pdf')
      mockedSendEmail.mockResolvedValue({ id: 'email-1' } as never)

      const result = await CareerApplicationService.submit(dto, {
        slug: 'my-job',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectOk(result)
      expect(mockedAppRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-1', name: 'Ana Silva' }),
      )
    })

    it('should return CAREER_JOB_NOT_FOUND for an unknown slug', async () => {
      mockedJobRepo.findBySlug.mockResolvedValue(
        err({
          code: 'CAREER_JOB_NOT_FOUND',
          message: 'not found',
          status: 404,
        }),
      )

      const result = await CareerApplicationService.submit(dto, {
        slug: 'nope',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
      expect(mockedAppRepo.create).not.toHaveBeenCalled()
    })

    it('should return CAREER_JOB_CLOSED for a job that is not open', async () => {
      const job = createFakeCareerJob({ id: 'job-1', status: 'CLOSED' })
      mockedJobRepo.findBySlug.mockResolvedValue(ok(job))

      const result = await CareerApplicationService.submit(dto, {
        slug: 'my-job',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectErr(result, 'CAREER_JOB_CLOSED')
      expect(mockedAppRepo.create).not.toHaveBeenCalled()
    })

    it('should propagate a resume validation error', async () => {
      const job = createFakeCareerJob({ id: 'job-1', status: 'OPEN' })
      mockedJobRepo.findBySlug.mockResolvedValue(ok(job))
      mockedValidateResume.mockReturnValue(err(validationError('Invalid PDF')))

      const result = await CareerApplicationService.submit(dto, {
        slug: 'my-job',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectErr(result, 'VALIDATION_ERROR')
      expect(mockedAppRepo.create).not.toHaveBeenCalled()
    })

    it('should propagate a storage persistence error', async () => {
      const job = createFakeCareerJob({ id: 'job-1', status: 'OPEN' })
      mockedJobRepo.findBySlug.mockResolvedValue(ok(job))
      mockedValidateResume.mockReturnValue(ok(undefined))
      mockedPersistResume.mockResolvedValue(err(databaseError('storage down')))

      const result = await CareerApplicationService.submit(dto, {
        slug: 'my-job',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectErr(result)
      expect(mockedAppRepo.create).not.toHaveBeenCalled()
    })

    it('should propagate a repository error when creating the application', async () => {
      const job = createFakeCareerJob({ id: 'job-1', status: 'OPEN' })
      mockedJobRepo.findBySlug.mockResolvedValue(ok(job))
      mockedValidateResume.mockReturnValue(ok(undefined))
      mockedPersistResume.mockResolvedValue(ok(undefined))
      mockedAppRepo.create.mockResolvedValue(err(databaseError()))

      const result = await CareerApplicationService.submit(dto, {
        slug: 'my-job',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectErr(result, 'DATABASE_ERROR')
      expect(mockedSendEmail).not.toHaveBeenCalled()
    })

    it('should still succeed if the notification email fails to send', async () => {
      const job = createFakeCareerJob({ id: 'job-1', status: 'OPEN' })
      mockedJobRepo.findBySlug.mockResolvedValue(ok(job))
      mockedValidateResume.mockReturnValue(ok(undefined))
      mockedPersistResume.mockResolvedValue(ok(undefined))
      mockedAppRepo.create.mockResolvedValue(
        ok(createFakeCareerApplication({ id: 'app-1', jobId: 'job-1' })),
      )
      mockedGetPresignedUrl.mockRejectedValue(new Error('minio exploded'))

      const result = await CareerApplicationService.submit(dto, {
        slug: 'my-job',
        ipAddress: '127.0.0.1',
        resumeFile,
      })

      expectOk(result)
    })
  })
})
