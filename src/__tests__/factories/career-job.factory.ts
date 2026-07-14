import { createId } from '@paralleldrive/cuid2'
import type { CareerJob, Prisma } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { CareerJobContentDTO } from '@/src/schemas/career-job.schema'
import type { CareerJobDTO } from '@/types/career-job'

const fakeContent: CareerJobContentDTO = {
  about: 'Você vai construir a interface do Nexo do zero.',
  responsibilities: ['Construir features de UI', 'Escrever testes'],
  requirements: ['React e TypeScript'],
  stack: ['Next.js', 'Tailwind CSS'],
}

export function createFakeCareerJob(overrides?: Partial<CareerJob>): CareerJob {
  const now = new Date()
  const content: Prisma.JsonValue = fakeContent
  return {
    id: createId(),
    slug: `job-${createId().slice(0, 8)}`,
    title: 'Junior Frontend Engineer',
    department: null,
    summary: 'Vaga para quem está começando a carreira em frontend',
    content,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeCareerJobDTO(
  overrides?: Partial<CareerJobDTO>,
): CareerJobDTO {
  const now = new Date().toISOString()
  return {
    id: createId(),
    slug: `job-${createId().slice(0, 8)}`,
    title: 'Junior Frontend Engineer',
    department: null,
    summary: 'Vaga para quem está começando a carreira em frontend',
    content: fakeContent,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedCareerJob(
  overrides?: Partial<
    Pick<CareerJob, 'slug' | 'title' | 'department' | 'summary' | 'status'>
  > & { content?: Prisma.InputJsonValue },
) {
  const { content, ...rest } = overrides ?? {}
  return prisma.careerJob.create({
    data: {
      slug: `job-${createId().slice(0, 8)}`,
      title: 'Seed Job',
      summary: 'Vaga de teste gerada para seed.',
      content: content ?? (fakeContent as Prisma.InputJsonValue),
      ...rest,
    },
  })
}
