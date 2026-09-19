import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  mockFetch,
  renderHookWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import type { StateDTO } from '@/types/state'
import { useFilteredIssues } from '../use-filtered-issues'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { getSession } }))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const BASE = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}`

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
    number: 1,
    title: 'Primeira issue',
    description: [],
    priority: 'NONE',
    startDate: null,
    dueDate: null,
    stateId: 'state-todo',
    typeId: 'type-1',
    cycleId: null,
    moduleId: null,
    labelIds: [],
    assigneeIds: [],
    estimateValueId: null,
    authorId: 'user-1',
    projectId: 'project-1',
    parentId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const STATES = [
  { id: 'state-todo', name: 'A fazer', group: 'UNSTARTED', order: 0 },
  { id: 'state-done', name: 'Concluído', group: 'COMPLETED', order: 1 },
] as StateDTO[]

const ISSUES = [
  buildIssue({ id: 'i-1', title: 'Login', priority: 'HIGH' }),
  buildIssue({
    id: 'i-2',
    number: 2,
    title: 'Cadastro',
    stateId: 'state-done',
    assigneeIds: ['user-me'],
  }),
]

function mockProjectApi() {
  return mockFetch().mockImplementation(async (input) => {
    const url = String(input)
    if (url.startsWith(`${BASE}/issues`))
      return apiSuccess({ items: ISSUES, nextCursor: null })
    if (url === `${BASE}/states`) return apiSuccess(STATES)
    return apiSuccess([])
  })
}

function renderFiltered(searchParams?: Record<string, string>) {
  return renderHookWithProviders(
    () => useFilteredIssues(WORKSPACE_ID, PROJECT_SLUG, 'NEX'),
    { searchParams },
  )
}

function titles(issues: IssueDTO[] | undefined) {
  return issues?.map((issue) => issue.title)
}

describe('useFilteredIssues', () => {
  it('returns every issue and loads no lookups when no filter is set', async () => {
    const fetchSpy = mockProjectApi()
    const { result } = renderFiltered()

    await waitFor(() =>
      expect(titles(result.current.data)).toEqual(['Login', 'Cadastro']),
    )
    expect(result.current.active).toBe(false)
    expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([
      `${BASE}/issues?limit=1000`,
    ])
    expect(getSession).not.toHaveBeenCalled()
  })

  it('narrows by the basic filters in the URL', async () => {
    mockProjectApi()
    const { result } = renderFiltered({
      filters: JSON.stringify([
        { id: 'c1', field: 'priority', operator: 'is', value: ['HIGH'] },
      ]),
    })

    await waitFor(() => expect(titles(result.current.data)).toEqual(['Login']))
    expect(result.current.active).toBe(true)
  })

  it('resolves PQL names against the project lookups', async () => {
    mockProjectApi()
    const { result } = renderFiltered({ mode: 'pql', pql: 'state = Concluído' })

    await waitFor(() =>
      expect(titles(result.current.data)).toEqual(['Cadastro']),
    )
  })

  it('resolves "me" to the signed-in user', async () => {
    mockProjectApi()
    getSession.mockResolvedValue({ data: { user: { id: 'user-me' } } })
    const { result } = renderFiltered({
      mode: 'pql',
      pql: 'assignees IN (me)',
    })

    await waitFor(() =>
      expect(titles(result.current.data)).toEqual(['Cadastro']),
    )
  })

  it('keeps the fetch error of the issues query', async () => {
    mockFetch().mockResolvedValue(apiError(500, 'Falha ao buscar'))

    const { result } = renderFiltered({ mode: 'pql', pql: 'state =' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Falha ao buscar')
  })

  it('exposes the unsupported clauses and the parse error', async () => {
    mockProjectApi()
    const unsupported = renderFiltered({ mode: 'pql', pql: 'hasComments()' })
    await waitFor(() => expect(unsupported.result.current.data).toHaveLength(2))
    expect(unsupported.result.current.unsupported).toEqual(['hasComments()'])

    const invalid = renderFiltered({ mode: 'pql', pql: 'state =' })
    await waitFor(() => expect(invalid.result.current.data).toHaveLength(2))
    expect(invalid.result.current.filterError).toEqual(expect.any(String))
    // The query's own error stays about fetching, not about the PQL.
    expect(invalid.result.current.error).toBeNull()
  })
})
