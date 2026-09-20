import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { IssueProjectSwitcher } from '../issue-project-switcher'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const WORKSPACE_ID = 'ws-1'

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Nexo',
    slug: 'nexo',
    identifier: 'NEX',
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: WORKSPACE_ID,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderSwitcher(workspaceSlug = 'acme') {
  mockFetch().mockResolvedValue(
    apiSuccess([
      buildProject(),
      buildProject({ id: 'project-2', name: 'Atlas', slug: 'atlas' }),
    ]),
  )
  return renderWithProviders(
    <IssueProjectSwitcher
      workspaceId={WORKSPACE_ID}
      workspaceSlug={workspaceSlug}
      projectSlug='nexo'
    />,
  )
}

describe('<IssueProjectSwitcher />', () => {
  it('shows the project currently being browsed', async () => {
    renderSwitcher()

    expect(
      await screen.findByRole('button', { name: 'Nexo' }),
    ).toBeInTheDocument()
  })

  it('navigates to the issues of the picked project', async () => {
    const { user } = renderSwitcher()

    await user.click(await screen.findByRole('button', { name: 'Nexo' }))
    await user.click(await screen.findByRole('option', { name: 'Atlas' }))

    expect(push).toHaveBeenCalledExactlyOnceWith('/acme/projects/atlas/issues')
  })

  it('keeps the navigation inside the current workspace', async () => {
    const { user } = renderSwitcher('outro')

    await user.click(await screen.findByRole('button', { name: 'Nexo' }))
    await user.click(await screen.findByRole('option', { name: 'Atlas' }))

    expect(push).toHaveBeenCalledExactlyOnceWith('/outro/projects/atlas/issues')
  })

  it('stays put when the current project is picked again', async () => {
    const { user } = renderSwitcher()

    await user.click(await screen.findByRole('button', { name: 'Nexo' }))
    await user.click(await screen.findByRole('option', { name: 'Nexo' }))

    expect(push).not.toHaveBeenCalled()
  })
})
