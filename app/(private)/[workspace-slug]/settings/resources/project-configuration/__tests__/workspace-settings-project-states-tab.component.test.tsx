import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDefaultProjectStateDTOs } from '@/src/__tests__/factories/dto/project-state.dto'
import { buildWorkspaceDTO } from '@/src/__tests__/factories/dto/workspace.dto'
import {
  apiError,
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import { WorkspaceSettingsProjectStatesTab } from '../workspace-settings-project-states-tab'
import { requests, routeFetch, toastOutcome } from './_helpers'

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

const STATES_URL = '/api/workspaces/ws-1/project-states'
const WORKSPACE_URL = '/api/workspaces/ws-1'

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}) {
  return buildWorkspaceDTO({ id: 'ws-1', ...overrides })
}

function renderTab(workspace = buildWorkspace(), canConfigure = true) {
  return renderWithProviders(
    <WorkspaceSettingsProjectStatesTab
      workspace={workspace}
      canConfigure={canConfigure}
    />,
  )
}

const stateSwitch = () =>
  screen.getByRole('switch', { name: 'Ativar estados do projeto' })

beforeEach(() => {
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsProjectStatesTab /> switch on', () => {
  it('shows the switch on and the list of states', async () => {
    routeFetch({
      [`GET ${STATES_URL}`]: () => apiSuccess(buildDefaultProjectStateDTOs()),
    })
    renderTab(buildWorkspace({ projectStatesEnabled: true }))

    expect(stateSwitch()).toBeChecked()
    expect(
      await screen.findByRole('button', {
        name: 'Adicionar estado em Monitoramento',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Ative os estados do projeto acima/),
    ).not.toBeInTheDocument()
  })
})

describe('<WorkspaceSettingsProjectStatesTab /> switch off', () => {
  it('explains the feature instead of listing states, and asks the API for none', () => {
    const spy = routeFetch({})
    renderTab(buildWorkspace({ projectStatesEnabled: false }))

    expect(stateSwitch()).not.toBeChecked()
    expect(
      screen.getByText(/Ative os estados do projeto acima/),
    ).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('turns the states on with a PATCH to the workspace', async () => {
    const spy = routeFetch({
      [`PATCH ${WORKSPACE_URL}`]: () =>
        apiSuccess(buildWorkspace({ projectStatesEnabled: true })),
      [`GET ${WORKSPACE_URL}`]: () =>
        apiSuccess(buildWorkspace({ projectStatesEnabled: true })),
    })
    const { user } = renderTab(buildWorkspace({ projectStatesEnabled: false }))

    await user.click(stateSwitch())

    await waitFor(() =>
      expect(requests(spy).find((r) => r.method === 'PATCH')).toEqual({
        url: WORKSPACE_URL,
        method: 'PATCH',
        body: { projectStatesEnabled: true },
      }),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Estados do projeto ativados',
    })
  })
})

describe('<WorkspaceSettingsProjectStatesTab /> turning it off', () => {
  it('PATCHes false and says so', async () => {
    const spy = routeFetch({
      [`GET ${STATES_URL}`]: () => apiSuccess(buildDefaultProjectStateDTOs()),
      [`PATCH ${WORKSPACE_URL}`]: () =>
        apiSuccess(buildWorkspace({ projectStatesEnabled: false })),
      [`GET ${WORKSPACE_URL}`]: () =>
        apiSuccess(buildWorkspace({ projectStatesEnabled: false })),
    })
    const { user } = renderTab(buildWorkspace({ projectStatesEnabled: true }))

    await user.click(stateSwitch())

    await waitFor(() =>
      expect(requests(spy).find((r) => r.method === 'PATCH')?.body).toEqual({
        projectStatesEnabled: false,
      }),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Estados do projeto desativados',
    })
  })

  it('surfaces the backend message when saving fails', async () => {
    routeFetch({
      [`GET ${STATES_URL}`]: () => apiSuccess(buildDefaultProjectStateDTOs()),
      [`PATCH ${WORKSPACE_URL}`]: () =>
        apiError(403, 'Apenas OWNER ou ADMIN podem editar o workspace'),
    })
    const { user } = renderTab(buildWorkspace({ projectStatesEnabled: true }))

    await user.click(stateSwitch())

    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'error',
      message: 'Apenas OWNER ou ADMIN podem editar o workspace',
    })
  })
})

describe('<WorkspaceSettingsProjectStatesTab /> permissions', () => {
  it('locks the switch for someone who cannot configure', () => {
    routeFetch({})
    renderTab(buildWorkspace({ projectStatesEnabled: false }), false)

    expect(stateSwitch()).toHaveAttribute('aria-disabled', 'true')
  })
})
