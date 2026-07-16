import type { CareerApplication } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const CareerApplicationRepository = {
  async create(data: {
    jobId: string
    name: string
    email: string
    phone: string | null
    linkedinUrl: string | null
    portfolioUrl: string | null
    lastJobTitle: string | null
    experienceYears: number | null
    message: string | null
    resumeBucket: string
    resumeKey: string
    resumeFileName: string
    consentAt: Date
    ipAddress: string
  }): Promise<Result<CareerApplication>> {
    try {
      const application = await prisma.careerApplication.create({ data })
      return ok(application)
    } catch (error) {
      return err(dbError('Failed to create career application', error))
    }
  },

  async listByJob(jobId: string): Promise<Result<CareerApplication[]>> {
    try {
      const applications = await prisma.careerApplication.findMany({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
      })
      return ok(applications)
    } catch (error) {
      return err(dbError('Failed to list career applications', error))
    }
  },
}
