import { screen } from '@testing-library/react'
import { describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import type { ProjectDTO } from '@/types/project'
import { ProjectGeneralSettingsForm } from '../project-general-settings-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}))

// The pickers are rich dropdowns (emoji catalogue, uploads) tested on their
// own; stub them down to a named button, as the behavioural suite does.
vi.mock(
  '@/app/_components/workspace/projects/modal/workspace-project-modal-emoji-icon-dialog',
  () => ({
    EmojiIconPicker: () => <button type='button'>Escolher emoji</button>,
  }),
)
vi.mock(
  '@/app/_components/workspace/projects/modal/workspace-project-modal-coverimage-dialog',
  () => ({
    CoverImagePicker: () => <button type='button'>Alterar capa</button>,
  }),
)

// The settings form is a page fragment inside the project settings shell,
// which owns the landmarks and the <h1>.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

function buildProject(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Roadmap',
    slug: 'roadmap',
    identifier: 'RM',
    description: 'Planejamento trimestral',
    emoji: '😊',
    coverImage: '/coverImages/image_1.jpg',
    isPublic: false,
    issueTypesEnabled: false,
    modulesEnabled: false,
    cyclesEnabled: false,
    estimatesEnabled: false,
    isFavorited: false,
    leadId: 'user-1',
    workspaceId: 'ws-1',
    archivedAt: null,
    createdAt: '2026-03-15T12:00:00.000Z',
    updatedAt: '2026-03-15T12:00:00.000Z',
    ...overrides,
  }
}

function renderForm(project = buildProject()) {
  return renderWithProviders(
    <ProjectGeneralSettingsForm
      workspaceId='ws-1'
      workspaceSlug='acme'
      project={project}
    />,
  )
}

describe('<ProjectGeneralSettingsForm /> accessibility', () => {
  it('has no violations on a private project', async () => {
    const { container } = renderForm()

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations on a public project with the features on', async () => {
    const { container } = renderForm(
      buildProject({
        isPublic: true,
        issueTypesEnabled: true,
        modulesEnabled: true,
        cyclesEnabled: true,
        estimatesEnabled: true,
      }),
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the project ID help popover open', async () => {
    const { user } = renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Sobre o ID do projeto' }),
    )
    await screen.findByText(/Máximo de 50 caracteres/)

    // The popover is portalled outside the render container.
    await expectNoA11yViolations(document.body, {
      disabledRules: FRAGMENT_RULES,
    })
  })
})
