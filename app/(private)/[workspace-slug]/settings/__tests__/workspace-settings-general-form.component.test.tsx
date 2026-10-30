import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWorkspaceDTO } from '@/src/__tests__/factories/dto/workspace.dto'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { WorkspaceDTO } from '@/types/workspace'
import { WorkspaceSettingsGeneralForm } from '../workspace-settings-general-form'

const { refresh, replace, push } = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace, push }),
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

type ToastMessages = {
  loading: string
  success: string
  error: (err: unknown) => string
}

async function lastToastOutcome() {
  const call = vi.mocked(toast.promise).mock.calls.at(-1)
  if (!call) throw new Error('toast.promise was not called')
  const [promise, messages] = call as unknown as [
    Promise<unknown>,
    ToastMessages,
  ]
  try {
    await promise
    return { type: 'success', message: messages.success }
  } catch (err) {
    return { type: 'error', message: messages.error(err) }
  }
}

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}) {
  return buildWorkspaceDTO({
    id: 'ws-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    teamSize: '11-50',
    timezone: 'America/Sao_Paulo',
    activePlan: 'FREE',
    ...overrides,
  })
}

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

function renderForm(workspace = buildWorkspace(), role: Role = 'OWNER') {
  return renderWithProviders(
    <WorkspaceSettingsGeneralForm workspace={workspace} role={role} />,
  )
}

const nameInput = () => screen.getByLabelText('Nome do espaço de trabalho')
const submitButton = () =>
  screen.getByRole('button', { name: 'Atualizar workspace' })

beforeEach(() => {
  refresh.mockReset()
  replace.mockReset()
  vi.mocked(toast.promise).mockReset()
  vi.mocked(toast.success).mockReset()
})

describe('<WorkspaceSettingsGeneralForm /> display', () => {
  it('prefills the form from the workspace', () => {
    renderForm()

    expect(nameInput()).toHaveValue('Acme Corp')
    expect(screen.getByLabelText('URL do espaço de trabalho')).toHaveValue(
      'nexopm.com/acme-corp',
    )
    expect(screen.getByLabelText('URL do espaço de trabalho')).toBeDisabled()
    expect(screen.getByText('11-50')).toBeInTheDocument()
    expect(screen.getByText('America/Sao_Paulo')).toBeInTheDocument()
  })

  it('shows the workspace name and url in the header', () => {
    renderForm()

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('nexopm.com/acme-corp')).toBeInTheDocument()
  })

  it('keeps a saved timezone the runtime does not list', () => {
    renderForm(buildWorkspace({ timezone: 'Mars/Olympus' }))

    expect(screen.getByText('Mars/Olympus')).toBeInTheDocument()
  })

  it('copies the full link when the url is clicked', async () => {
    const { user } = renderForm()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    await user.click(
      screen.getByRole('button', { name: 'nexopm.com/acme-corp' }),
    )

    expect(writeText).toHaveBeenCalledWith('https://nexopm.com/acme-corp')
    expect(toast.success).toHaveBeenCalledWith('Link copiado')
  })

  it('opens the logo dialog from "Carregar logo"', async () => {
    const { user } = renderForm()
    expect(screen.queryByText('Logo do workspace')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Carregar logo' }))

    expect(screen.getByText('Logo do workspace')).toBeInTheDocument()
  })

  it.each([
    'MEMBER',
    'VIEWER',
  ] as const)('offers no "Carregar logo" to %s', (role) => {
    renderForm(buildWorkspace(), role)

    expect(
      screen.queryByRole('button', { name: 'Carregar logo' }),
    ).not.toBeInTheDocument()
  })

  it('opens its dropdowns below the field, not over it', async () => {
    const { user } = renderForm()

    await user.click(screen.getByText('11-50'))

    await screen.findByRole('option', { name: '51-200' })
    expect(
      document.querySelector('[data-slot="select-content"]'),
    ).toHaveAttribute('data-align-trigger', 'false')
  })
})

describe('<WorkspaceSettingsGeneralForm /> roles', () => {
  it.each(['OWNER', 'ADMIN'] as const)('lets %s edit the form', (role) => {
    renderForm(buildWorkspace(), role)

    expect(nameInput()).toBeEnabled()
  })

  it.each([
    'MEMBER',
    'VIEWER',
  ] as const)('locks the whole form for %s', (role) => {
    renderForm(buildWorkspace(), role)

    expect(nameInput()).toBeDisabled()
    expect(submitButton()).toBeDisabled()
  })

  it('shows the delete block only to the OWNER', () => {
    renderForm(buildWorkspace(), 'OWNER')

    expect(screen.getByText('Excluir este workspace')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it.each([
    'ADMIN',
    'MEMBER',
    'VIEWER',
  ] as const)('hides the delete block from %s', (role) => {
    renderForm(buildWorkspace(), role)

    expect(screen.queryByText('Excluir este workspace')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Excluir' }),
    ).not.toBeInTheDocument()
  })
})

describe('<WorkspaceSettingsGeneralForm /> saving', () => {
  it('keeps the submit button disabled until something changes', async () => {
    const { user } = renderForm()
    expect(submitButton()).toBeDisabled()

    await user.type(nameInput(), '!')
    expect(submitButton()).toBeEnabled()

    await user.type(nameInput(), '{Backspace}')
    expect(submitButton()).toBeDisabled()
  })

  it('PATCHes the edited fields to the workspace url', async () => {
    const updated = buildWorkspace({ name: 'Acme Inc' })
    const fetchSpy = mockFetch()
      .mockResolvedValueOnce(apiSuccess(updated))
      .mockResolvedValue(apiSuccess(updated)) // refetch after invalidation
    const { user } = renderForm()

    await user.clear(nameInput())
    await user.type(nameInput(), 'Acme Inc')
    await user.click(submitButton())

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/workspaces/ws-1',
      method: 'PATCH',
      body: {
        name: 'Acme Inc',
        timezone: 'America/Sao_Paulo',
        teamSize: '11-50',
      },
    })
    expect(await lastToastOutcome()).toEqual({
      type: 'success',
      message: 'Workspace atualizado',
    })
  })

  it('omits teamSize when the workspace never set one', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace()),
    )
    const { user } = renderForm(buildWorkspace({ teamSize: null }))

    await user.type(nameInput(), '!')
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy).body).toEqual({
      name: 'Acme Corp!',
      timezone: 'America/Sao_Paulo',
    })
  })

  it('sends the chosen team size', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(buildWorkspace()),
    )
    const { user } = renderForm()

    await user.click(screen.getByText('11-50'))
    await user.click(await screen.findByRole('option', { name: '51-200' }))
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy).body).toMatchObject({ teamSize: '51-200' })
  })

  it('blocks saving a name shorter than the schema allows', async () => {
    const fetchSpy = mockFetch()
    const { user } = renderForm()

    await user.clear(nameInput())
    await user.type(nameInput(), 'A')
    expect(submitButton()).toBeDisabled()

    await user.clear(nameInput())
    await user.type(nameInput(), '  ')
    expect(submitButton()).toBeDisabled()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('disables the button while the request is in flight', async () => {
    const pending = deferredResponse()
    mockFetch()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(apiSuccess(buildWorkspace()))
    const { user } = renderForm()

    await user.type(nameInput(), '!')
    await user.click(submitButton())

    await waitFor(() => expect(submitButton()).toBeDisabled())
    pending.resolve(apiSuccess(buildWorkspace()))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('surfaces the backend message and does not refresh when it fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Slug já está em uso'))
    const { user } = renderForm()

    await user.type(nameInput(), '!')
    await user.click(submitButton())

    expect(await lastToastOutcome()).toEqual({
      type: 'error',
      message: 'Slug já está em uso',
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  // The page is served by the data access layer, which the client router
  // keeps for minutes: the screen must follow the saved workspace on its own.
  it('shows the saved workspace at once, without waiting for the router', async () => {
    const updated = buildWorkspace({ name: 'Acme Inc' })
    mockFetch().mockResolvedValue(apiSuccess(updated))
    const { user } = renderForm()

    await user.clear(nameInput())
    await user.type(nameInput(), 'Acme Inc')
    await user.click(submitButton())

    await waitFor(() =>
      expect(
        screen.getByText('Acme Inc', { selector: 'div' }),
      ).toBeInTheDocument(),
    )
    expect(submitButton()).toBeDisabled()
  })
})
