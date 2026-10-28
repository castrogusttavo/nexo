import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { IssueTypeDTO } from '@/types/issue-type'
import { TypePicker } from '../type-picker'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

function buildType(overrides: Partial<IssueTypeDTO> = {}): IssueTypeDTO {
  return {
    id: 'type-1',
    name: 'Bug',
    description: null,
    color: 'RED',
    icon: 'bug',
    isSystem: true,
    order: 0,
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const TYPES = [
  buildType(),
  buildType({ id: 'type-2', name: 'Melhoria', color: 'BLUE', order: 1 }),
]

function mockTypes(types: IssueTypeDTO[] = TYPES) {
  return mockFetch().mockResolvedValue(apiSuccess(types))
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof TypePicker>> = {},
) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...renderWithProviders(
      <TypePicker
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
        value={undefined}
        {...props}
        onChange={onChange}
      />,
    ),
  }
}

describe('<TypePicker />', () => {
  it('reads the project issue types and prompts when nothing is selected', async () => {
    const fetchSpy = mockTypes()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Tipo' }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(
      `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/issue-types`,
    )
  })

  it('labels the trigger with the selected type', async () => {
    mockTypes()
    renderPicker({ value: 'type-2' })

    expect(
      await screen.findByRole('button', { name: 'Melhoria' }),
    ).toBeInTheDocument()
  })

  it('falls back to the prompt when the stored type no longer exists', async () => {
    mockTypes()
    renderPicker({ value: 'type-removed' })

    expect(
      await screen.findByRole('button', { name: 'Tipo' }),
    ).toBeInTheDocument()
  })

  it('reports the picked type by id', async () => {
    mockTypes()
    const { user, onChange } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Melhoria' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('type-2')
  })

  it('shows the empty message when the project has no type', async () => {
    mockTypes([])
    const { user } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Tipo' }))

    expect(await screen.findByText('Nenhum resultado.')).toBeInTheDocument()
  })
})
