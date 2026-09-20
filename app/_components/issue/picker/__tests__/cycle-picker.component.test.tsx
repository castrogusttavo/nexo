import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { CycleDTO } from '@/types/cycle'
import { CyclePicker } from '../cycle-picker'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

function buildCycle(overrides: Partial<CycleDTO> = {}): CycleDTO {
  return {
    id: 'cycle-1',
    name: 'Sprint 1',
    description: null,
    status: 'IN_PROGRESS',
    startDate: null,
    endDate: null,
    leadId: 'user-1',
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const CYCLES = [
  buildCycle(),
  buildCycle({ id: 'cycle-2', name: 'Sprint 2', status: 'NOT_STARTED' }),
  buildCycle({ id: 'cycle-3', name: 'Sprint 0', status: 'COMPLETED' }),
]

function mockCycles(cycles: CycleDTO[] = CYCLES) {
  return mockFetch().mockResolvedValue(apiSuccess(cycles))
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof CyclePicker>> = {},
) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...renderWithProviders(
      <CyclePicker
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
        value={undefined}
        {...props}
        onChange={onChange}
      />,
    ),
  }
}

describe('<CyclePicker />', () => {
  it('reads the project cycles and prompts when none is assigned', async () => {
    const fetchSpy = mockCycles()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Ciclo' }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(
      `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/cycles`,
    )
  })

  it('labels the trigger with the assigned cycle', async () => {
    mockCycles()
    renderPicker({ value: 'cycle-2' })

    expect(
      await screen.findByRole('button', { name: 'Sprint 2' }),
    ).toBeInTheDocument()
  })

  it('offers every cycle plus an explicit "no cycle" option', async () => {
    mockCycles()
    const { user } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Ciclo' }))

    expect(
      await screen.findByRole('option', { name: 'Nenhum ciclo' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('reports the picked cycle by id', async () => {
    mockCycles()
    const { user, onChange } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Ciclo' }))
    await user.click(await screen.findByRole('option', { name: 'Sprint 1' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('cycle-1')
  })

  it('reports undefined when the cycle is cleared', async () => {
    mockCycles()
    const { user, onChange } = renderPicker({ value: 'cycle-1' })

    await user.click(await screen.findByRole('button', { name: 'Sprint 1' }))
    await user.click(
      await screen.findByRole('option', { name: 'Nenhum ciclo' }),
    )

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined)
  })

  it('shows only the "no cycle" option when the project has no cycle', async () => {
    mockCycles([])
    const { user } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Ciclo' }))

    expect(
      await screen.findByRole('option', { name: 'Nenhum ciclo' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(1)
  })
})
