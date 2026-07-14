import type { CareerJob } from '@prisma/client'
import type { CareerJobDTO } from '@/types/career-job'
import type { CareerJobContentDTO } from '../schemas/career-job.schema'
import { withTimestamps } from './_shared'

export function toCareerJobDTO(job: CareerJob): CareerJobDTO {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    department: job.department ?? null,
    summary: job.summary,
    content: job.content as CareerJobContentDTO,
    status: job.status,
    ...withTimestamps(job),
  }
}
