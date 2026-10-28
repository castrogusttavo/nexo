import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import { ParentPicker } from '../parent-picker'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
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

function mockIssues(items: IssueDTO[] = ISSUES) {
  return mockFetch().mockResolvedValue(
    apiSuccess({ items, nextCursor: null as number | null }),
  )
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof ParentPicker>> = {},
) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...renderWithProviders(
      <ParentPicker
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
        value={undefined}
        {...props}
        onChange={onChange}
      />,
    ),
  }
}

describe('<ParentPicker />', () => {
  it('reads the project issues and prompts when nothing is selected', async () => {
    const fetchSpy = mockIssues()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Adicionar pai' }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(
      `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues?limit=1000`,
    )
  })

  it('labels the trigger with the selected parent', async () => {
    mockIssues()
    renderPicker({ value: 'issue-2' })

    expect(
      await screen.findByRole('button', { name: '#2 Segunda issue' }),
    ).toBeInTheDocument()
  })

  it('reports the picked issue id, number and title', async () => {
    mockIssues()
    const { user, onChange } = renderPicker()

    await user.click(
      await screen.findByRole('button', { name: 'Adicionar pai' }),
    )
    await user.click(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    )

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      id: 'issue-2',
      number: 2,
      title: 'Segunda issue',
    })
  })

  it('never offers the issue being edited as its own parent', async () => {
    mockIssues()
    const { user } = renderPicker({ excludeIssueId: 'issue-1' })

    await user.click(
      await screen.findByRole('button', { name: 'Adicionar pai' }),
    )

    expect(
      await screen.findByRole('option', { name: '#2 Segunda issue' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: '#1 Primeira issue' }),
    ).not.toBeInTheDocument()
  })

  it('shows the empty message when the project has no other issue', async () => {
    mockIssues([])
    const { user } = renderPicker()

    await user.click(
      await screen.findByRole('button', { name: 'Adicionar pai' }),
    )

    expect(await screen.findByText('Nenhum resultado.')).toBeInTheDocument()
  })
})
