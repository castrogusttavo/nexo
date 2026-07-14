import { createId } from '@paralleldrive/cuid2'
import type { CareerApplication } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { CareerApplictionDTO } from '@/types/career-application'

export function createFakeCareerApplication(
  overrides?: Partial<CareerApplication>,
): CareerApplication {
  const now = new Date()
  return {
    id: createId(),
    jobId: createId(),
    name: 'Ana Silva',
    email: 'ana@example.com',
    phone: null,
    portfolioUrl: null,
    message: null,
    resumeBucket: 'career-applications',
    resumeKey: `resumes/${createId()}.pdf`,
    resumeFileName: 'curriculo.pdf',
    consentAt: now,
    ipAddress: '127.0.0.1',
    status: 'RECEIVED',
    createdAt: now,
    ...overrides,
  }
}

export function createFakeCareerApplicationDTO(
  overrides?: Partial<CareerApplictionDTO>,
): CareerApplictionDTO {
  const now = new Date().toISOString()
  return {
    id: createId(),
    jobId: createId(),
    name: 'Ana Silva',
    email: 'ana@example.com',
    phone: null,
    portfolioUrl: null,
    message: null,
    resumeFileName: 'curriculo.pdf',
    consentAt: now,
    ipAddress: '127.0.0.1',
    status: 'RECEIVED',
    createdAt: now,
    ...overrides,
  }
}

export async function seedCareerApplication(
  jobId: string,
  overrides?: Partial<
    Pick<
      CareerApplication,
      | 'name'
      | 'email'
      | 'phone'
      | 'portfolioUrl'
      | 'message'
      | 'resumeBucket'
      | 'resumeKey'
      | 'resumeFileName'
      | 'consentAt'
      | 'ipAddress'
      | 'status'
    >
  >,
) {
  return prisma.careerApplication.create({
    data: {
      jobId,
      name: 'Seed Candidate',
      email: `candidate-${createId().slice(0, 8)}@example.com`,
      resumeBucket: 'career-applications',
      resumeKey: `resumes/${createId()}.pdf`,
      resumeFileName: 'curriculo.pdf',
      consentAt: new Date(),
      ipAddress: '127.0.0.1',
      ...overrides,
    },
  })
}
