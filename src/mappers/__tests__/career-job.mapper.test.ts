import { describe, expect, it } from 'vitest'
import { createFakeCareerJob } from '@/src/__tests__/factories/career-job.factory'
import { toCareerJobDTO } from '../career-job.mapper'

describe('toCareerJobDTO', () => {
  it('should mpa all fields correctly', () => {
    const job = createFakeCareerJob({
      id: 'job-1',
      slug: 'junior-frontend',
      title: 'Junior Frontend Engineer',
      department: 'Engineering',
      summary: 'A vaga',
      status: 'OPEN',
    })

    const dto = toCareerJobDTO(job)

    expect(dto).toEqual({
      id: 'job-1',
      slug: 'junior-frontend',
      title: 'Junior Frontend Engineer',
      department: 'Engineering',
      summary: 'A vaga',
      content: job.content,
      location: null,
      locationType: 'ON_SITE',
      employmentType: 'FULL_TIME',
      status: 'OPEN',
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.createdAt.toISOString(),
    })
  })

  it('should default department to null', () => {
    const job = createFakeCareerJob({ department: null })

    const dto = toCareerJobDTO(job)

    expect(dto.department).toBeNull()
  })
})
