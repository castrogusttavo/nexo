import { describe, expect, it } from 'vitest'
import { seedCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { CareerJobRepository } from '../career-job.repository'

const content = {
  about: 'Sobre a vaga',
  responsibilities: ['Fazer coisas'],
  requirements: ['Saber coisas'],
  stack: ['TypeScript'],
}

describe('CareerJobRepository', () => {
  describe('findById()', () => {
    it('should return the job when it exists', async () => {
      const seeded = await seedCareerJob({ title: 'My Job' })

      const result = await CareerJobRepository.findById(seeded.id)

      const job = expectOk(result)
      expect(job.id).toBe(seeded.id)
      expect(job.title).toBe('My Job')
    })

    it('should return CAREER_JOB_NOT_FOUND when it does ot exist', async () => {
      const result = await CareerJobRepository.findById('nonexistent')

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
    })
  })

  describe('findBySlug()', () => {
    it('should return the job when the slug exists', async () => {
      const seeded = await seedCareerJob({ slug: 'my-job-slug' })

      const result = await CareerJobRepository.findBySlug('my-job-slug')

      const job = expectOk(result)
      expect(job.id).toBe(seeded.id)
    })

    it('should return CAREER_JOB_NOT_FOUND for an unknown slug', async () => {
      const result = await CareerJobRepository.findBySlug('nope')

      expectErr(result, 'CAREER_JOB_NOT_FOUND')
    })
  })

  describe('listPublic()', () => {
    it('should return only OPEN and CLOSED jobs, OPEN first', async () => {
      await seedCareerJob({ slug: 'draft-job', status: 'DRAFT' })
      const closed = await seedCareerJob({
        slug: 'closed-job',
        status: 'CLOSED',
      })
      const open = await seedCareerJob({ slug: 'open-job', status: 'OPEN' })

      const result = await CareerJobRepository.listPublic()

      const jobs = expectOk(result)
      expect(jobs.map((j) => j.id)).toEqual([open.id, closed.id])
    })
  })

  describe('listAll()', () => {
    it('should return jobs of every status', async () => {
      await seedCareerJob({ slug: 'a', status: 'DRAFT' })
      await seedCareerJob({ slug: 'b', status: 'OPEN' })
      await seedCareerJob({ slug: 'c', status: 'CLOSED' })

      const result = await CareerJobRepository.listAll()

      const jobs = expectOk(result)
      expect(jobs).toHaveLength(3)
    })
  })

  describe('create()', () => {
    it('should persist a new job as DRAFT', async () => {
      const result = await CareerJobRepository.create({
        slug: 'new-job',
        title: 'New Job',
        summary: 'Resumo da vaga',
        content,
      })

      const job = expectOk(result)
      expect(job.slug).toBe('new-job')
      expect(job.status).toBe('DRAFT')
    })

    it('should return CAREER_JOB_SLUG_TAKEN on duplicate slug', async () => {
      await seedCareerJob({ slug: 'dup-slug' })

      const result = await CareerJobRepository.create({
        slug: 'dup-slug',
        title: 'Another',
        summary: 'Resumo',
        content,
      })

      expectErr(result, 'CAREER_JOB_SLUG_TAKEN')
    })
  })

  describe('update()', () => {
    it('should update the title', async () => {
      const seeded = await seedCareerJob({ title: 'Old' })

      const result = await CareerJobRepository.update(seeded.id, {
        title: 'New',
      })

      const job = expectOk(result)
      expect(job.title).toBe('New')
    })

    it('should return CAREER_JOB_SLUG_TAKEN when updating to a taken slug', async () => {
      await seedCareerJob({ slug: 'taken' })
      const seeded = await seedCareerJob({ slug: 'mine' })

      const result = await CareerJobRepository.update(seeded.id, {
        slug: 'taken',
      })

      expectErr(result, 'CAREER_JOB_SLUG_TAKEN')
    })
  })

  describe('changeStatus()', () => {
    it('should change the status', async () => {
      const seeded = await seedCareerJob({ status: 'DRAFT' })

      const result = await CareerJobRepository.changeStatus(seeded.id, 'OPEN')

      const job = expectOk(result)
      expect(job.status).toBe('OPEN')
    })
  })
})
