import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { ModuleDTO } from '@/types/module'
import { ModulePicker } from '../module-picker'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

function buildModule(overrides: Partial<ModuleDTO> = {}): ModuleDTO {
  return {
    id: 'module-1',
    name: 'Autenticação',
    progress: 0,
    status: 'IN_PROGRESS',
    startDate: null,
    endDate: null,
    isFavorited: false,
    leadId: 'user-1',
    projectId: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const MODULES = [
  buildModule(),
  buildModule({ id: 'module-2', name: 'Faturamento', status: 'PLANNED' }),
]

function mockModules(modules: ModuleDTO[] = MODULES) {
  return mockFetch().mockResolvedValue(apiSuccess(modules))
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof ModulePicker>> = {},
) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...renderWithProviders(
      <ModulePicker
        workspaceId={WORKSPACE_ID}
        projectSlug={PROJECT_SLUG}
        value={undefined}
        {...props}
        onChange={onChange}
      />,
    ),
  }
}

describe('<ModulePicker />', () => {
  it('reads the project modules and prompts when none is assigned', async () => {
    const fetchSpy = mockModules()
    renderPicker()

    expect(
      await screen.findByRole('button', { name: 'Módulo' }),
    ).toBeInTheDocument()
    expect(getFetchCall(fetchSpy).url).toBe(
      `/api/workspaces/${WORKSPACE_ID}/projects/${PROJECT_SLUG}/modules`,
    )
  })

  it('labels the trigger with the assigned module', async () => {
    mockModules()
    renderPicker({ value: 'module-2' })

    expect(
      await screen.findByRole('button', { name: 'Faturamento' }),
    ).toBeInTheDocument()
  })

  it('offers every module plus an explicit "no module" option', async () => {
    mockModules()
    const { user } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Módulo' }))

    expect(
      await screen.findByRole('option', { name: 'Nenhum módulo' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('check-marks the assigned module and treats re-picking it as a no-op', async () => {
    mockModules()
    const { user, onChange } = renderPicker({ value: 'module-1' })

    await user.click(
      await screen.findByRole('button', { name: 'Autenticação' }),
    )

    // The check icon renders only on the selected row, next to the module
    // icon every row carries — both are decorative, so count the drawings.
    const selected = await screen.findByRole('option', { name: 'Autenticação' })
    const other = screen.getByRole('option', { name: 'Faturamento' })
    expect(selected.querySelectorAll('svg')).toHaveLength(2)
    expect(other.querySelectorAll('svg')).toHaveLength(1)

    await user.click(selected)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reports the picked module by id', async () => {
    mockModules()
    const { user, onChange } = renderPicker()

    await user.click(await screen.findByRole('button', { name: 'Módulo' }))
    await user.click(await screen.findByRole('option', { name: 'Faturamento' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('module-2')
  })

  it('reports undefined when the module is cleared', async () => {
    mockModules()
    const { user, onChange } = renderPicker({ value: 'module-1' })

    await user.click(
      await screen.findByRole('button', { name: 'Autenticação' }),
    )
    await user.click(
      await screen.findByRole('option', { name: 'Nenhum módulo' }),
    )

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined)
  })
})
