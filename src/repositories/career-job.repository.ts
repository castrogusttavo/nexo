import type {
  CareerEmploymentType,
  CareerJob,
  CareerJobStatus,
  CareerLocationType,
  Prisma,
} from '@prisma/client'
import { careerJobNotFound, careerJobSlugTaken } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

const PUBLIC_STATUS_ORDER: Record<string, number> = { OPEN: 0, CLOSED: 1 }

export const CareerJobRepository = {
  async findById(id: string): Promise<Result<CareerJob>> {
    try {
      const job = await prisma.careerJob.findUnique({ where: { id } })
      if (!job) return err(careerJobNotFound())
      return ok(job)
    } catch (error) {
      return err(dbError('Failed to find career job by id', error))
    }
  },

  async findBySlug(slug: string): Promise<Result<CareerJob>> {
    try {
      const job = await prisma.careerJob.findUnique({ where: { slug } })
      if (!job) return err(careerJobNotFound())
      return ok(job)
    } catch (error) {
      return err(dbError('Failed to find career job by slug', error))
    }
  },

  async listPublic(): Promise<Result<CareerJob[]>> {
    try {
      const jobs = await prisma.careerJob.findMany({
        where: { status: { in: ['OPEN', 'CLOSED'] } },
        orderBy: { createdAt: 'desc' },
      })
      const sorted = [...jobs].sort(
        (a, b) => PUBLIC_STATUS_ORDER[a.status] - PUBLIC_STATUS_ORDER[b.status],
      )
      return ok(sorted)
    } catch (error) {
      return err(dbError('Failed to list public career jobs', error))
    }
  },

  async listAll(): Promise<Result<CareerJob[]>> {
    try {
      const jobs = await prisma.careerJob.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return ok(jobs)
    } catch (error) {
      return err(dbError('Failed to list career jobs', error))
    }
  },

  async create(data: {
    slug: string
    title: string
    department?: string
    summary: string
    content: Prisma.InputJsonValue
    location?: string
    locationType: CareerLocationType
    employmentType: CareerEmploymentType
  }): Promise<Result<CareerJob>> {
    try {
      const job = await prisma.careerJob.create({ data })
      return ok(job)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(careerJobSlugTaken())
      }
      return err(dbError('Failed to create career job', error))
    }
  },

  async update(
    id: string,
    data: {
      slug?: string
      title?: string
      department?: string | null
      summary?: string
      content?: Prisma.InputJsonValue
      location?: string | null
      locationType?: CareerLocationType
      employmentType?: CareerEmploymentType
    },
  ): Promise<Result<CareerJob>> {
    try {
      const job = await prisma.careerJob.update({ where: { id }, data })
      return ok(job)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(careerJobSlugTaken())
      }
      return err(dbError('Failed to update career job', error))
    }
  },

  async changeStatus(
    id: string,
    status: CareerJobStatus,
  ): Promise<Result<CareerJob>> {
    try {
      const job = await prisma.careerJob.update({
        where: { id },
        data: { status },
      })
      return ok(job)
    } catch (error) {
      return err(dbError('Failed to change career job status', error))
    }
  },
}
