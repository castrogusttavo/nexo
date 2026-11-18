import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProjectLabelDTO } from '@/src/__tests__/factories/dto/project-label.dto'
import { buildDefaultProjectStateDTOs } from '@/src/__tests__/factories/dto/project-state.dto'
import { buildWorkspaceDTO } from '@/src/__tests__/factories/dto/workspace.dto'
import {
  apiSuccess,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import { WorkspaceSettingsProjectConfiguration } from '../workspace-settings-project-configuration'
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

const WORKSPACE_URL = '/api/workspaces/ws-1'

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}) {
  return buildWorkspaceDTO({ id: 'ws-1', ...overrides })
}

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

function renderPage(workspace = buildWorkspace(), role: Role = 'OWNER') {
  return renderWithProviders(
    <WorkspaceSettingsProjectConfiguration workspace={workspace} role={role} />,
  )
}

const membersSwitch = () =>
  screen.getByRole('switch', { name: 'Permitir que membros criem projetos' })

beforeEach(() => {
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsProjectConfiguration />', () => {
  it('titles the page and explains what the settings apply to', () => {
    routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () =>
        apiSuccess(buildDefaultProjectStateDTOs()),
    })
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Projetos' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/se aplicam a todos os projetos deste workspace/),
    ).toBeInTheDocument()
  })

  it('reflects the workspace setting in the members switch', () => {
    routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () => apiSuccess([]),
    })
    const { unmount } = renderPage(
      buildWorkspace({ membersCanCreateProjects: true }),
    )
    expect(membersSwitch()).toBeChecked()
    unmount()

    renderPage(buildWorkspace({ membersCanCreateProjects: false }))
    expect(membersSwitch()).not.toBeChecked()
  })

  it('PATCHes the switch and tells the user who can create projects now', async () => {
    const off = buildWorkspace({ membersCanCreateProjects: false })
    const spy = routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () => apiSuccess([]),
      [`PATCH ${WORKSPACE_URL}`]: () => apiSuccess(off),
      [`GET ${WORKSPACE_URL}`]: () => apiSuccess(off),
    })
    const { user } = renderPage(
      buildWorkspace({ membersCanCreateProjects: true }),
    )

    await user.click(membersSwitch())

    await waitFor(() =>
      expect(requests(spy).find((r) => r.method === 'PATCH')).toEqual({
        url: WORKSPACE_URL,
        method: 'PATCH',
        body: { membersCanCreateProjects: false },
      }),
    )
    expect(await toastOutcome(vi.mocked(toast.promise))).toEqual({
      type: 'success',
      message: 'Só administradores criam projetos',
    })
  })

  it('follows the saved workspace, not the stale one the page rendered with', async () => {
    const off = buildWorkspace({ membersCanCreateProjects: false })
    routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () => apiSuccess([]),
      [`PATCH ${WORKSPACE_URL}`]: () => apiSuccess(off),
      [`GET ${WORKSPACE_URL}`]: () => apiSuccess(off),
    })
    const { user } = renderPage(
      buildWorkspace({ membersCanCreateProjects: true }),
    )

    await user.click(membersSwitch())

    await waitFor(() => expect(membersSwitch()).not.toBeChecked())
  })

  it.each(['OWNER', 'ADMIN'] as const)('lets %s change the switch', (role) => {
    routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () => apiSuccess([]),
    })
    renderPage(buildWorkspace(), role)

    expect(membersSwitch()).not.toHaveAttribute('aria-disabled', 'true')
  })

  it.each(['MEMBER', 'VIEWER'] as const)('locks the switch for %s', (role) => {
    routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () => apiSuccess([]),
    })
    renderPage(buildWorkspace(), role)

    expect(membersSwitch()).toHaveAttribute('aria-disabled', 'true')
  })

  it('starts on the states tab and loads the labels only when asked', async () => {
    const spy = routeFetch({
      [`GET ${WORKSPACE_URL}/project-states`]: () =>
        apiSuccess(buildDefaultProjectStateDTOs()),
      [`GET ${WORKSPACE_URL}/project-labels`]: () =>
        apiSuccess([buildProjectLabelDTO({ name: 'Marketing' })]),
    })
    const { user } = renderPage()
    await screen.findByRole('button', {
      name: 'Adicionar estado em Monitoramento',
    })
    expect(requests(spy).some((r) => r.url.endsWith('/project-labels'))).toBe(
      false,
    )

    await user.click(screen.getByRole('tab', { name: 'Etiquetas do projeto' }))

    expect(await screen.findByText('Marketing')).toBeInTheDocument()
  })
})
