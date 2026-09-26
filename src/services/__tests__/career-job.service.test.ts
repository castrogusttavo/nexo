import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env/server-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env/server-admin')>()
  return {
    ...actual,
    // A function now, not a constant: the admin variables are validated on
    // first use, so that importing this service — as the public /careers page
    // does — never demands credentials it has no business needing.
    getPlatformAdminEmails: () => ['admin@nexopm.com'],
  }
})
vi.mock('@/src/repositories/career-job.repository')

import { createFakeCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { CareerJobRepository } from '@/src/repositories/career-job.repository'
import { CareerJobService } from '../career-job.service'

const mockedRepo = vi.mocked(CareerJobRepository)

const admin = {
  id: 'actor-1',
  email: 'admin@nexopm.com',
  twoFactorEnabled: true,
}
const outsider = {
  id: 'actor-2',
  email: 'someone@else.com',
  twoFactorEnabled: true,
}
const adminWithoutTwoFactor = { ...admin, twoFactorEnabled: false }

describe('CareerJobService', () => {
  describe('getBySlug()', () => {
    it('should return the job as a DTO', async () => {
      const job = createFakeCareerJob({ slug: 'my-job' })
      mockedRepo.findBySlug.mockResolvedValue(ok(job))

      const result = await CareerJobService.getBySlug('my-job')

      const dto = expectOk(result)
      expect(dto.slug).toBe('my-job')
    })

    it('should propagate not found from repo', async () => {
      mockedRepo.findBySlug.mockResolvedValue(
        err({
          code: 'CAREER_JOB_NOT_FOUND',
          message: 'not found',
          status: 404,
        }),
      )

      const result = await CareerJobService.getBySlug('nope')

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
    })
  })

  describe('getById()', () => {
    it('should return the job for a platform admin', async () => {
      const job = createFakeCareerJob({ id: 'job-1' })
      mockedRepo.findById.mockResolvedValue(ok(job))

      const result = await CareerJobService.getById(admin, 'job-1')

      const dto = expectOk(result)
      expect(dto.id).toBe('job-1')
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.getById(outsider, 'job-1')

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
      expect(mockedRepo.findById).not.toHaveBeenCalled()
    })

    it('should propagate not found from repo', async () => {
      mockedRepo.findById.mockResolvedValue(
        err({
          code: 'CAREER_JOB_NOT_FOUND',
          message: 'not found',
          status: 404,
        }),
      )

      const result = await CareerJobService.getById(admin, 'nope')

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
    })
  })

  describe('listPublic()', () => {
    it('should return jobs as DTOs', async () => {
      mockedRepo.listPublic.mockResolvedValue(ok([createFakeCareerJob()]))

      const result = await CareerJobService.listPublic()

      const dtos = expectOk(result)
      expect(dtos).toHaveLength(1)
    })
  })

  describe('listAll()', () => {
    it('should return all jobs for a platform admin', async () => {
      mockedRepo.listAll.mockResolvedValue(ok([createFakeCareerJob()]))

      const result = await CareerJobService.listAll(admin)

      expectOk(result)
      expect(mockedRepo.listAll).toHaveBeenCalled()
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.listAll(outsider)

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
      expect(mockedRepo.listAll).not.toHaveBeenCalled()
    })

    it('should return FORBIDDEN for a null email', async () => {
      const result = await CareerJobService.listAll({
        id: 'actor-3',
        email: null,
      })

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
    })

    // Being on the allowlist is half the check. A password alone must not
    // open the platform surfaces, and the distinct code is what lets the UI
    // tell an admin to turn 2FA on instead of dead-ending them on a 403.
    it('should demand a second factor from an allowlisted admin', async () => {
      const result = await CareerJobService.listAll(adminWithoutTwoFactor)

      expectErr(result, 'ADMIN_TWO_FACTOR_REQUIRED')
      expect(mockedRepo.listAll).not.toHaveBeenCalled()
    })

    it('should keep non-admins on the plain forbidden code', async () => {
      const result = await CareerJobService.listAll({
        ...outsider,
        twoFactorEnabled: false,
      })

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
    })
  })

  describe('create()', () => {
    it('should demand a second factor from an allowlisted admin', async () => {
      const result = await CareerJobService.create(adminWithoutTwoFactor, dto)

      expectErr(result, 'ADMIN_TWO_FACTOR_REQUIRED')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    const dto = {
      slug: 'new-job',
      title: 'New Job',
      summary: 'Resumo',
      content: {
        about: 'Sobre',
        responsibilities: ['A'],
        requirements: ['B'],
        stack: ['C'],
      },
      locationType: 'ON_SITE' as const,
      employmentType: 'FULL_TIME' as const,
    }

    it('should create a job for a platform admin', async () => {
      mockedRepo.create.mockResolvedValue(ok(createFakeCareerJob(dto)))

      const result = await CareerJobService.create(admin, dto)

      expectOk(result)
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.create(outsider, dto)

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedRepo.create.mockResolvedValue(err(databaseError()))

      const result = await CareerJobService.create(admin, dto)

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should demand a second factor from an allowlisted admin', async () => {
      const result = await CareerJobService.update(
        adminWithoutTwoFactor,
        'job-1',
        {
          title: 'Updated',
        },
      )

      expectErr(result, 'ADMIN_TWO_FACTOR_REQUIRED')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should update when actor is a platform admin', async () => {
      const existing = createFakeCareerJob({ id: 'job-1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.update.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1', title: 'Updated' })),
      )

      const result = await CareerJobService.update(admin, 'job-1', {
        title: 'Updated',
      })

      const dto = expectOk(result)
      expect(dto.title).toBe('Updated')
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.update(outsider, 'job-1', {
        title: 'Updated',
      })

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
      expect(mockedRepo.findById).not.toHaveBeenCalled()
    })

    it('should propagate not found when the job does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(
        err({
          code: 'CAREER_JOB_NOT_FOUND',
          message: 'not found',
          status: 404,
        }),
      )

      const result = await CareerJobService.update(admin, 'nope', {
        title: 'Updated',
      })

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate repo error on update failure', async () => {
      mockedRepo.findById.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1' })),
      )
      mockedRepo.update.mockResolvedValue(err(databaseError()))

      const result = await CareerJobService.update(admin, 'job-1', {
        title: 'Updated',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('changeStatus()', () => {
    it('should demand a second factor from an allowlisted admin', async () => {
      const result = await CareerJobService.changeStatus(
        adminWithoutTwoFactor,
        'job-1',
        {
          status: 'OPEN',
        },
      )

      expectErr(result, 'ADMIN_TWO_FACTOR_REQUIRED')
      expect(mockedRepo.changeStatus).not.toHaveBeenCalled()
    })

    it('should change status when actor is a platform admin', async () => {
      const existing = createFakeCareerJob({ id: 'job-1', status: 'DRAFT' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.changeStatus.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1', status: 'OPEN' })),
      )

      const result = await CareerJobService.changeStatus(admin, 'job-1', {
        status: 'OPEN',
      })

      const dto = expectOk(result)
      expect(dto.status).toBe('OPEN')
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.changeStatus(outsider, 'job-1', {
        status: 'OPEN',
      })

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
    })

    it('should propagate not found when the job does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(
        err({
          code: 'CAREER_JOB_NOT_FOUND',
          message: 'not found',
          status: 404,
        }),
      )

      const result = await CareerJobService.changeStatus(admin, 'nope', {
        status: 'OPEN',
      })

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
      expect(mockedRepo.changeStatus).not.toHaveBeenCalled()
    })

    it('should propagate repo error on status change failure', async () => {
      mockedRepo.findById.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1', status: 'DRAFT' })),
      )
      mockedRepo.changeStatus.mockResolvedValue(err(databaseError()))

      const result = await CareerJobService.changeStatus(admin, 'job-1', {
        status: 'OPEN',
      })

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
