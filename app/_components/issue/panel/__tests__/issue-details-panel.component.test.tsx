import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueDTO } from '@/types/issue'
import { IssueDetailsPanel } from '../issue-details-panel'

const { EDITED_DESCRIPTION } = vi.hoisted(() => ({
  EDITED_DESCRIPTION: [{ type: 'p', children: [{ text: 'Editado' }] }],
}))

// The real editor mounts Plate; this stub shows the content it was handed
// and offers one way to emit a change.
vi.mock('@/components/editor/rich-editor', () => ({
  IssueRichEditor: ({
    content,
    onChange,
  }: {
    content: unknown
    onChange: (value: unknown) => void
  }) => (
    <div>
      <p>{JSON.stringify(content)}</p>
      <button type='button' onClick={() => onChange(EDITED_DESCRIPTION)}>
        Editar descrição
      </button>
    </div>
  ),
}))

const { useIsMobile } = vi.hoisted(() => ({ useIsMobile: vi.fn() }))
vi.mock('@/components/hooks/use-mobile', () => ({ useIsMobile }))

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

function buildIssue(overrides: Partial<IssueDTO> = {}): IssueDTO {
  return {
    id: 'issue-1',
    number: 1,
    title: 'Primeira issue',
    description: [{ type: 'p', children: [{ text: 'Olá' }] }],
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

function renderPanel({
  open = true,
  issue = buildIssue(),
  isMobile = false,
}: {
  open?: boolean
  issue?: IssueDTO
  isMobile?: boolean
} = {}) {
  useIsMobile.mockReturnValue(isMobile)
  const onOpenChange = vi.fn()
  return {
    onOpenChange,
    issue,
    ...renderWithProviders(
      <IssueDetailsPanel
        open={open}
        onOpenChange={onOpenChange}
        issue={issue}
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
      />,
    ),
  }
}

describe('<IssueDetailsPanel />', () => {
  it('stays closed until asked to open', () => {
    renderPanel({ open: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the issue title and its description', () => {
    renderPanel()

    expect(
      screen.getByRole('heading', { name: 'Primeira issue' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        JSON.stringify([{ type: 'p', children: [{ text: 'Olá' }] }]),
      ),
    ).toBeInTheDocument()
  })

  it('slides in from the right on a desktop viewport', () => {
    renderPanel()

    expect(screen.getByRole('dialog')).toHaveAttribute(
      'data-swipe-direction',
      'right',
    )
  })

  it('slides up from the bottom on a touch viewport', () => {
    renderPanel({ isMobile: true })

    expect(screen.getByRole('dialog')).toHaveAttribute(
      'data-swipe-direction',
      'down',
    )
  })

  it('patches the issue description as it is edited', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(buildIssue()))
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Editar descrição' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toEqual({
      url: `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issues/issue-1`,
      method: 'PATCH',
      body: {
        description: [{ type: 'p', children: [{ text: 'Editado' }] }],
      },
    })
  })

  it('reports the close so the caller can drop the panel', async () => {
    const { user, onOpenChange } = renderPanel()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(onOpenChange.mock.calls[0]?.[0]).toBe(false))
  })
})
