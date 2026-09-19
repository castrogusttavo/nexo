import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { CreateCareerJobDTO } from '@/src/schemas/career-job.schema'
import type { CareerJobDTO } from '@/types/career-job'
import {
  useChangeCareerJobStatus,
  useCreateCareerJob,
  useUpdateCareerJob,
} from '../use-career-jobs'

const LIST_KEY = ['admin', 'career-jobs']
const JOB_KEY = ['admin', 'career-jobs', 'job-1']
const OTHER_JOB_KEY = ['admin', 'career-jobs', 'job-2']

function buildCreateInput(
  overrides: Partial<CreateCareerJobDTO> = {},
): CreateCareerJobDTO {
  return {
    slug: 'senior-frontend',
    title: 'Senior Frontend Engineer',
    summary: 'Construa a interface do Nexo.',
    content: {
      about: 'Sobre a vaga de frontend.',
      responsibilities: ['Entregar features'],
      requirements: ['React'],
      stack: ['Next.js'],
    },
    locationType: 'REMOTE',
    employmentType: 'FULL_TIME',
    ...overrides,
  }
}

function buildJob(overrides: Partial<CareerJobDTO> = {}): CareerJobDTO {
  const input = buildCreateInput()
  return {
    id: 'job-1',
    slug: input.slug,
    title: input.title,
    department: null,
    summary: input.summary,
    content: input.content,
    location: null,
    locationType: 'REMOTE',
    employmentType: input.employmentType,
    status: 'DRAFT',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

type Client = ReturnType<typeof renderHookWithProviders>['queryClient']

function seedJobQueries(queryClient: Client) {
  queryClient.setQueryData(LIST_KEY, [buildJob()])
  queryClient.setQueryData(JOB_KEY, buildJob())
  queryClient.setQueryData(OTHER_JOB_KEY, buildJob({ id: 'job-2' }))
}

function isInvalidated(queryClient: Client, key: unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated
}

describe('useCreateCareerJob', () => {
  it('POSTs the job and invalidates every career job query', async () => {
    const job = buildJob()
    const input = buildCreateInput()
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(job, 201))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateCareerJob(),
    )
    seedJobQueries(queryClient)

    let created: CareerJobDTO | undefined
    await act(async () => {
      created = await result.current.mutateAsync(input)
    })

    expect(created).toEqual(job)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/admin/careers',
      method: 'POST',
      body: input,
    })
    expect(isInvalidated(queryClient, LIST_KEY)).toBe(true)
    expect(isInvalidated(queryClient, JOB_KEY)).toBe(true)
  })

  it('invalidates nothing and surfaces the error when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Slug já em uso'))
    const { result, queryClient } = renderHookWithProviders(() =>
      useCreateCareerJob(),
    )
    seedJobQueries(queryClient)

    await act(async () => {
      await expect(
        result.current.mutateAsync(buildCreateInput()),
      ).rejects.toThrow('Slug já em uso')
    })

    expect(isInvalidated(queryClient, LIST_KEY)).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() => useCreateCareerJob())

    await act(async () => {
      await expect(
        result.current.mutateAsync(buildCreateInput()),
      ).rejects.toThrow('Erro ao criar vaga')
    })
  })
})

describe('useUpdateCareerJob', () => {
  it('PATCHes the partial update on the job url and invalidates the list and job', async () => {
    const updated = buildJob({ title: 'Staff Frontend Engineer' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(updated))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateCareerJob('job-1'),
    )
    seedJobQueries(queryClient)

    let returned: CareerJobDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({
        title: 'Staff Frontend Engineer',
      })
    })

    expect(returned).toEqual(updated)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/admin/careers/job-1',
      method: 'PATCH',
      body: { title: 'Staff Frontend Engineer' },
    })
    expect(isInvalidated(queryClient, LIST_KEY)).toBe(true)
    expect(isInvalidated(queryClient, JOB_KEY)).toBe(true)
  })

  it('invalidates nothing when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result, queryClient } = renderHookWithProviders(() =>
      useUpdateCareerJob('job-1'),
    )
    seedJobQueries(queryClient)

    await act(async () => {
      await expect(
        result.current.mutateAsync({ title: 'Staff' }),
      ).rejects.toThrow('Erro ao atualizar vaga')
    })

    expect(isInvalidated(queryClient, LIST_KEY)).toBe(false)
    expect(isInvalidated(queryClient, JOB_KEY)).toBe(false)
  })
})

describe('useChangeCareerJobStatus', () => {
  it('PATCHes the status endpoint and invalidates the list and job', async () => {
    const opened = buildJob({ status: 'OPEN' })
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(opened))
    const { result, queryClient } = renderHookWithProviders(() =>
      useChangeCareerJobStatus('job-1'),
    )
    seedJobQueries(queryClient)

    let returned: CareerJobDTO | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({ status: 'OPEN' })
    })

    expect(returned).toEqual(opened)
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/admin/careers/job-1/status',
      method: 'PATCH',
      body: { status: 'OPEN' },
    })
    expect(isInvalidated(queryClient, LIST_KEY)).toBe(true)
    expect(isInvalidated(queryClient, JOB_KEY)).toBe(true)
  })

  it('surfaces the backend message for an invalid transition', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(422, 'Transição de status inválida'),
    )
    const { result, queryClient } = renderHookWithProviders(() =>
      useChangeCareerJobStatus('job-1'),
    )
    seedJobQueries(queryClient)

    await act(async () => {
      await expect(
        result.current.mutateAsync({ status: 'DRAFT' }),
      ).rejects.toThrow('Transição de status inválida')
    })

    expect(isInvalidated(queryClient, JOB_KEY)).toBe(false)
  })

  it('falls back to the hook message when the error body has none', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500))
    const { result } = renderHookWithProviders(() =>
      useChangeCareerJobStatus('job-1'),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync({ status: 'CLOSED' }),
      ).rejects.toThrow('Erro ao mudar status da vaga')
    })
  })
})
