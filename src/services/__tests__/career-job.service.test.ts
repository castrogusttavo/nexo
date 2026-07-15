import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env/server')>()
  return {
    ...actual,
    PLATFORM_ADMIN_EMAILS: ['admin@nexo.coodee.dev'],
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

      const result = await CareerJobService.getById(
        'admin@nexo.coodee.dev',
        'job-1',
      )

      const dto = expectOk(result)
      expect(dto.id).toBe('job-1')
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.getById('someone@else.com', 'job-1')

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

      const result = await CareerJobService.getById(
        'admin@nexo.coodee.dev',
        'nope',
      )

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

      const result = await CareerJobService.listAll('admin@nexo.coodee.dev')

      expectOk(result)
      expect(mockedRepo.listAll).toHaveBeenCalled()
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.listAll('someone@else.com')

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
      expect(mockedRepo.listAll).not.toHaveBeenCalled()
    })

    it('should return FORBIDDEN for a null email', async () => {
      const result = await CareerJobService.listAll(null)

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
    })
  })

  describe('create()', () => {
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
    }

    it('should create a job for a platform admin', async () => {
      mockedRepo.create.mockResolvedValue(ok(createFakeCareerJob(dto)))

      const result = await CareerJobService.create(
        'actor-1',
        'admin@nexo.coodee.dev',
        dto,
      )

      expectOk(result)
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.create(
        'actor-1',
        'someone@else.com',
        dto,
      )

      expectErr(result, 'CAREER_JOB_FORBIDDEN')
      expect(mockedRepo.create).not.toHaveBeenCalled()
    })

    it('should propagate repo error', async () => {
      mockedRepo.create.mockResolvedValue(err(databaseError()))

      const result = await CareerJobService.create(
        'actor-1',
        'admin@nexo.coodee.dev',
        dto,
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update when actor is a platform admin', async () => {
      const existing = createFakeCareerJob({ id: 'job-1' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.update.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1', title: 'Updated' })),
      )

      const result = await CareerJobService.update(
        'actor-1',
        'admin@nexo.coodee.dev',
        'job-1',
        { title: 'Updated' },
      )

      const dto = expectOk(result)
      expect(dto.title).toBe('Updated')
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.update(
        'actor-1',
        'someone@else.com',
        'job-1',
        { title: 'Updated' },
      )

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

      const result = await CareerJobService.update(
        'actor-1',
        'admin@nexo.coodee.dev',
        'nope',
        { title: 'Updated' },
      )

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
      expect(mockedRepo.update).not.toHaveBeenCalled()
    })

    it('should propagate repo error on update failure', async () => {
      mockedRepo.findById.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1' })),
      )
      mockedRepo.update.mockResolvedValue(err(databaseError()))

      const result = await CareerJobService.update(
        'actor-1',
        'admin@nexo.coodee.dev',
        'job-1',
        { title: 'Updated' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('changeStatus()', () => {
    it('should change status when actor is a platform admin', async () => {
      const existing = createFakeCareerJob({ id: 'job-1', status: 'DRAFT' })
      mockedRepo.findById.mockResolvedValue(ok(existing))
      mockedRepo.changeStatus.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1', status: 'OPEN' })),
      )

      const result = await CareerJobService.changeStatus(
        'actor-1',
        'admin@nexo.coodee.dev',
        'job-1',
        { status: 'OPEN' },
      )

      const dto = expectOk(result)
      expect(dto.status).toBe('OPEN')
    })

    it('should return FORBIDDEN for a non-admin email', async () => {
      const result = await CareerJobService.changeStatus(
        'actor-1',
        'someone@else.com',
        'job-1',
        { status: 'OPEN' },
      )

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

      const result = await CareerJobService.changeStatus(
        'actor-1',
        'admin@nexo.coodee.dev',
        'nope',
        { status: 'OPEN' },
      )

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
      expect(mockedRepo.changeStatus).not.toHaveBeenCalled()
    })

    it('should propagate repo error on status change failure', async () => {
      mockedRepo.findById.mockResolvedValue(
        ok(createFakeCareerJob({ id: 'job-1', status: 'DRAFT' })),
      )
      mockedRepo.changeStatus.mockResolvedValue(err(databaseError()))

      const result = await CareerJobService.changeStatus(
        'actor-1',
        'admin@nexo.coodee.dev',
        'job-1',
        { status: 'OPEN' },
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })
})
