import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildProjectDTO } from '@/src/__tests__/factories/dto/project.dto'
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
  return buildProjectDTO({
    name: 'Nexo',
    slug: 'nexo',
    identifier: 'NEX',
    workspaceId: WORKSPACE_ID,
    ...overrides,
  })
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
