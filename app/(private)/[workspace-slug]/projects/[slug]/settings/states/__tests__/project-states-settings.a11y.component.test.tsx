import { screen } from '@testing-library/react'
import { describe, it, vi } from 'vitest'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { StateColorDTO, StateDTO } from '@/types/state'
import { ProjectStatesSettings } from '../project-states-settings'

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

// The real swatches are unlabeled color dots inside a popover; stub the
// picker with one named button per color, as the behavioural suite does.
vi.mock('@/app/_components/ui/color-swatch-picker', () => ({
  ColorSwatchPicker: ({ colors }: { colors: { value: StateColorDTO }[] }) => (
    <div>
      {colors.map((color) => (
        <button key={color.value} type='button'>
          {`Cor ${color.value}`}
        </button>
      ))}
    </div>
  ),
}))

// The settings panel is a page fragment inside the project settings shell,
// which owns the landmarks and the <h1>.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

function buildState(overrides: Partial<StateDTO> = {}): StateDTO {
  return {
    id: 'state-1',
    name: 'Backlog',
    description: null,
    group: 'BACKLOG',
    color: 'ZINC',
    order: 0,
    isDefault: false,
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const STATES: StateDTO[] = [
  buildState({ id: 's-todo', name: 'A fazer', group: 'UNSTARTED', order: 2 }),
  buildState({
    id: 's-triage',
    name: 'Triagem',
    group: 'UNSTARTED',
    order: 1,
    isDefault: true,
  }),
  buildState({
    id: 's-doing',
    name: 'Fazendo',
    group: 'STARTED',
    color: 'YELLOW',
    description: 'Trabalho em andamento',
  }),
  buildState({ id: 's-done', name: 'Feito', group: 'COMPLETED' }),
]

function mockStatesApi() {
  return mockFetch().mockImplementation(async (_input, init) => {
    if (!init?.method || init.method === 'GET') return apiSuccess(STATES)
    return apiSuccess(STATES[0])
  })
}

async function renderSettings() {
  mockStatesApi()
  const utils = renderWithProviders(
    <ProjectStatesSettings workspaceId='ws-1' projectSlug='roadmap' />,
  )
  await screen.findByText('Triagem')
  return utils
}

describe('<ProjectStatesSettings /> accessibility', () => {
  it('has no violations on the states listing', async () => {
    const { container } = await renderSettings()

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the create-state form open', async () => {
    const { container, user } = await renderSettings()

    await user.click(
      screen.getByRole('button', { name: 'Adicionar estado em Backlog' }),
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with a state being edited', async () => {
    const { container, user } = await renderSettings()

    await user.click(
      screen.getByRole('button', { name: 'Editar estado Fazendo' }),
    )

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })
})
