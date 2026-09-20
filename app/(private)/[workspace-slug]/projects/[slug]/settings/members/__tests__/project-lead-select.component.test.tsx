import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import { ProjectLeadSelect } from '../project-lead-select'

const TIMESTAMPS = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

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
    workspaceId: 'ws-1',
    archivedAt: null,
    ...TIMESTAMPS,
    ...overrides,
  }
}

const MEMBERS: ProjectMemberDTO[] = [
  {
    userId: 'user-1',
    name: 'Ana Souza',
    username: 'ana',
    image: null,
    email: 'ana@nexo.test',
    isLead: true,
    createdAt: TIMESTAMPS.createdAt,
  },
]

function renderSelect(project: ProjectDTO) {
  mockFetch().mockResolvedValue(apiSuccess(project))
  return renderWithProviders(
    <ProjectLeadSelect
      workspaceId='ws-1'
      projectSlug='nexo'
      members={MEMBERS}
      canManage
    />,
  )
}

describe('<ProjectLeadSelect />', () => {
  it('shows the current lead', async () => {
    renderSelect(buildProject())

    expect(await screen.findByText('@ana')).toBeInTheDocument()
  })

  it('prompts for a pick when the lead is set but not a listed member', async () => {
    renderSelect(buildProject({ leadId: 'user-gone' }))

    expect(
      await screen.findByText('Selecionar líder do projeto'),
    ).toBeInTheDocument()
  })

  // Deleting a user nulls `leadId` rather than deleting the project. That is
  // a state, not a prompt: the project genuinely has no lead.
  it('says the project has no lead when the lead was deleted', async () => {
    renderSelect(buildProject({ leadId: null }))

    expect(await screen.findByText('Sem líder')).toBeInTheDocument()
    expect(
      screen.queryByText('Selecionar líder do projeto'),
    ).not.toBeInTheDocument()
  })
})
