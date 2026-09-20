import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ProjectPicker } from '../project-picker'

const WORKSPACE_ID = 'ws-1'

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Nexo',
    slug: 'nexo',
    identifier: 'NEX',
    description: null,
    emoji: '🚀',
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

const PROJECTS = [
  buildProject(),
  buildProject({
    id: 'project-2',
    name: 'Atlas',
    slug: 'atlas',
    identifier: 'ATL',
    emoji: null,
  }),
]

function mockProjects(projects: ProjectDTO[] = PROJECTS) {
  return mockFetch().mockResolvedValue(apiSuccess(projects))
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof ProjectPicker>> = {},
) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...renderWithProviders(
      <ProjectPicker
        workspaceId={WORKSPACE_ID}
        value={undefined}
        {...props}
        onChange={onChange}
      />,
    ),
  }
}

describe('<ProjectPicker />', () => {
  it('reads the workspace projects and prompts when nothing is selected', async () => {
    const fetchSpy = mockProjects()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Projeto' }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(
      `/api/workspaces/${WORKSPACE_ID}/projects`,
    )
  })

  it('labels the trigger with the selected project emoji and name', async () => {
    mockProjects()
    renderPicker({ value: 'nexo' })

    expect(
      await screen.findByRole('button', { name: '🚀 Nexo' }),
    ).toBeInTheDocument()
  })

  it('drops the leading space when the selected project has no emoji', async () => {
    mockProjects()
    renderPicker({ value: 'atlas' })

    expect(
      await screen.findByRole('button', { name: 'Atlas' }),
    ).toBeInTheDocument()
  })

  it('reports the picked project by slug', async () => {
    mockProjects()
    const { user, onChange } = renderPicker({ value: 'nexo' })

    await user.click(await screen.findByRole('button', { name: '🚀 Nexo' }))
    await user.click(await screen.findByRole('option', { name: 'Atlas' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('atlas')
  })

  it('shows the empty message when the workspace has no project', async () => {
    mockProjects([])
    const { user } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Projeto' }))

    expect(await screen.findByText('Nenhum resultado.')).toBeInTheDocument()
  })
})
