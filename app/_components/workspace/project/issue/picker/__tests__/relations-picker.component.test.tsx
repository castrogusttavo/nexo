import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO, IssueRelationDTO } from '@/types/issue'
import { RelationsPicker } from '../relations-picker'

// Real sonner attaches its own handlers to the tracked promise; the stub
// does the same so a rejected mutation never surfaces as an unhandled
// rejection in the test run.
vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn((promise: Promise<unknown>) => {
      void Promise.resolve(promise).catch(() => {})
    }),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'
const ISSUE_ID = 'issue-1'
const RELATIONS_URL = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/${ISSUE_ID}/relations`

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: ISSUE_ID,
    number: 1,
    title: 'Primeira issue',
    description: [],
    priority: 'NONE',
    startDate: null,
    dueDate: null,
    stateId: 'state-1',
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

const ISSUES = [
  buildIssue(),
  buildIssue({ id: 'issue-2', number: 2, title: 'Segunda issue' }),
]

function buildRelation(
  overrides: Partial<IssueRelationDTO> = {},
): IssueRelationDTO {
  return {
    id: 'rel-1',
    sourceId: ISSUE_ID,
    targetId: 'issue-2',
    type: 'RELATES_TO',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

type FetchSpy = ReturnType<typeof mockFetch>

function mockApi({
  relations = [] as IssueRelationDTO[],
  issues = ISSUES,
  mutation,
}: {
  relations?: IssueRelationDTO[]
  issues?: IssueDTO[]
  mutation?: () => Response
} = {}) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (input, init) => {
    if (init?.method && init.method !== 'GET') {
      return mutation ? mutation() : apiSuccess(buildRelation())
    }
    if (String(input).endsWith('/relations')) return apiSuccess(relations)
    return apiSuccess({ items: issues, nextCursor: null })
  })
  return fetchSpy
}

function mutationCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method !== 'GET')
}

function renderPicker() {
  return renderWithProviders(
    <RelationsPicker
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      issueId={ISSUE_ID}
    />,
  )
}

const typeTrigger = () => screen.getByRole('button', { name: 'Tipo' })
const issueTrigger = () => screen.getByRole('button', { name: 'Issue' })
const addButton = () => screen.getByRole('button', { name: 'Adicionar' })

describe('<RelationsPicker /> listing', () => {
  it('shows nothing but the add row when the issue has no relation', async () => {
    mockApi()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Tipo' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remover relação' }),
    ).not.toBeInTheDocument()
  })

  it('names each relation after its type and target issue', async () => {
    mockApi({
      relations: [
        buildRelation(),
        buildRelation({ id: 'rel-2', type: 'IMPLEMENTS' }),
      ],
    })
    renderPicker()

    expect(
      await screen.findByText(/Relaciona com\s+#2 Segunda issue/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Implementa\s+#2 Segunda issue/),
    ).toBeInTheDocument()
  })

  it('falls back to the raw id when the target issue is not loaded', async () => {
    mockApi({
      relations: [buildRelation({ targetId: 'issue-unknown' })],
      issues: [buildIssue()],
    })
    renderPicker()

    expect(await screen.findByText(/issue-unknown/)).toBeInTheDocument()
  })
})

describe('<RelationsPicker /> mutations', () => {
  it('keeps the add button disabled until both a type and an issue are picked', async () => {
    mockApi()
    const { user } = renderPicker()

    await screen.findByRole('button', { name: 'Tipo' })
    expect(addButton()).toBeDisabled()

    await user.click(typeTrigger())
    await user.click(await screen.findByRole('option', { name: 'Implementa' }))
    expect(addButton()).toBeDisabled()

    await user.click(issueTrigger())
    await user.click(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    )
    expect(addButton()).toBeEnabled()
  })

  it('posts the picked type and target, then resets the row', async () => {
    const fetchSpy = mockApi()
    const { user } = renderPicker()

    await screen.findByRole('button', { name: 'Tipo' })
    await user.click(typeTrigger())
    await user.click(await screen.findByRole('option', { name: 'Implementa' }))
    await user.click(issueTrigger())
    await user.click(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    )
    await user.click(addButton())

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: RELATIONS_URL,
      method: 'POST',
      body: { targetId: 'issue-2', type: 'IMPLEMENTS' },
    })
    // Both combobox triggers fall back to their placeholders.
    expect(typeTrigger()).toBeInTheDocument()
    expect(issueTrigger()).toBeInTheDocument()
  })

  it('never offers the current issue as its own relation target', async () => {
    mockApi()
    const { user } = renderPicker()

    await screen.findByRole('button', { name: 'Tipo' })
    await user.click(issueTrigger())

    expect(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: '#1 Primeira issue' }),
    ).not.toBeInTheDocument()
  })

  it('deletes the relation behind the remove button', async () => {
    const fetchSpy = mockApi({ relations: [buildRelation()] })
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('button', { name: 'Remover relação' }),
    )

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${RELATIONS_URL}/rel-1`,
      method: 'DELETE',
    })
  })

  it('keeps the row on screen when the server rejects the removal', async () => {
    mockApi({
      relations: [buildRelation()],
      mutation: () => apiError(403, 'Sem permissão'),
    })
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('button', { name: 'Remover relação' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Remover relação' }),
    ).toBeInTheDocument()
  })
})
