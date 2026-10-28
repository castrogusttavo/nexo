import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDependencyDTO, IssueDTO } from '@/types/issue'
import { DependenciesPicker } from '../dependencies-picker'

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
const BASE = `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}`
const DEPENDENCIES_URL = `${BASE}/issues/${ISSUE_ID}/dependencies`

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

function buildDependency(
  overrides: Partial<IssueDependencyDTO> = {},
): IssueDependencyDTO {
  return {
    id: 'dep-1',
    sourceId: ISSUE_ID,
    targetId: 'issue-2',
    type: 'BLOCKS',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

type FetchSpy = ReturnType<typeof mockFetch>

function mockApi({
  dependencies = [] as IssueDependencyDTO[],
  issues = ISSUES,
  mutation,
}: {
  dependencies?: IssueDependencyDTO[]
  issues?: IssueDTO[]
  mutation?: () => Response
} = {}) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (input, init) => {
    if (init?.method && init.method !== 'GET') {
      return mutation ? mutation() : apiSuccess(buildDependency())
    }
    if (String(input).endsWith('/dependencies')) return apiSuccess(dependencies)
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
    <DependenciesPicker
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      issueId={ISSUE_ID}
    />,
  )
}

const typeTrigger = () => screen.getByRole('button', { name: 'Tipo' })
const issueTrigger = () => screen.getByRole('button', { name: 'Issue' })
const addButton = () => screen.getByRole('button', { name: 'Adicionar' })

describe('<DependenciesPicker /> listing', () => {
  it('shows nothing but the add row when the issue has no dependency', async () => {
    mockApi()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Tipo' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remover dependência' }),
    ).not.toBeInTheDocument()
  })

  it('names an outbound dependency after the blocked issue', async () => {
    mockApi({ dependencies: [buildDependency()] })
    renderPicker()

    expect(
      await screen.findByText(/Bloqueando\s+#2 Segunda issue/),
    ).toBeInTheDocument()
  })

  it('flips the label when the current issue is the dependency target', async () => {
    mockApi({
      dependencies: [
        buildDependency({ sourceId: 'issue-2', targetId: ISSUE_ID }),
      ],
    })
    renderPicker()

    expect(await screen.findByText(/Bloqueado por/)).toBeInTheDocument()
  })

  it('falls back to the raw id when the target issue is not loaded', async () => {
    mockApi({
      dependencies: [buildDependency({ targetId: 'issue-unknown' })],
      issues: [buildIssue()],
    })
    renderPicker()

    expect(await screen.findByText(/issue-unknown/)).toBeInTheDocument()
  })
})

describe('<DependenciesPicker /> mutations', () => {
  it('keeps the add button disabled until both a type and an issue are picked', async () => {
    mockApi()
    const { user } = renderPicker()

    await screen.findByRole('button', { name: 'Tipo' })
    expect(addButton()).toBeDisabled()

    await user.click(typeTrigger())
    await user.click(await screen.findByRole('option', { name: 'Bloqueando' }))
    expect(addButton()).toBeDisabled()

    await user.click(issueTrigger())
    await user.click(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    )
    expect(addButton()).toBeEnabled()
  })

  it('posts the display type mapped to its database value and resets the row', async () => {
    const fetchSpy = mockApi()
    const { user } = renderPicker()

    await screen.findByRole('button', { name: 'Tipo' })
    await user.click(typeTrigger())
    await user.click(
      await screen.findByRole('option', { name: 'Termina antes' }),
    )
    await user.click(issueTrigger())
    await user.click(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    )
    await user.click(addButton())

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toEqual({
      url: DEPENDENCIES_URL,
      method: 'POST',
      body: { targetId: 'issue-2', type: 'FINISHES_BEFORE' },
    })
    // Both combobox triggers fall back to their placeholders.
    expect(typeTrigger()).toBeInTheDocument()
    expect(issueTrigger()).toBeInTheDocument()
  })

  it('never offers the current issue as its own dependency target', async () => {
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

  it('deletes the dependency behind the remove button', async () => {
    const fetchSpy = mockApi({ dependencies: [buildDependency()] })
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('button', { name: 'Remover dependência' }),
    )

    await waitFor(() => expect(mutationCalls(fetchSpy)).toHaveLength(1))
    expect(mutationCalls(fetchSpy)[0]).toMatchObject({
      url: `${DEPENDENCIES_URL}/dep-1`,
      method: 'DELETE',
    })
  })

  it('keeps the row on screen when the server rejects the removal', async () => {
    mockApi({
      dependencies: [buildDependency()],
      mutation: () => apiError(403, 'Sem permissão'),
    })
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('button', { name: 'Remover dependência' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Remover dependência' }),
    ).toBeInTheDocument()
  })
})
