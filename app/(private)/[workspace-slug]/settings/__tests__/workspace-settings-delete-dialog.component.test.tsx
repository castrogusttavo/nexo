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
import { WorkspaceSettingsDeleteDialog } from '../workspace-settings-delete-dialog'

const { replace, push } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
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

const workspace = buildWorkspaceDTO({
  id: 'ws-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  activePlan: 'FREE',
})

const triggerButton = () => screen.getByRole('button', { name: 'Excluir' })
const confirmButton = () =>
  screen.getByRole('button', { name: 'Excluir workspace' })

async function openDialog(overrides: Partial<WorkspaceDTO> = {}) {
  const view = renderWithProviders(
    <WorkspaceSettingsDeleteDialog
      workspace={{ ...workspace, ...overrides }}
    />,
  )
  await view.user.click(triggerButton())
  return view
}

beforeEach(() => {
  replace.mockReset()
  push.mockReset()
  vi.mocked(toast.promise).mockReset()
})

describe('<WorkspaceSettingsDeleteDialog /> on the FREE plan', () => {
  it('stays closed until the trigger is clicked', () => {
    renderWithProviders(<WorkspaceSettingsDeleteDialog workspace={workspace} />)

    expect(screen.queryByText('Excluir Acme Corp?')).not.toBeInTheDocument()
  })

  it('warns that the delete is permanent', async () => {
    await openDialog()

    expect(screen.getByText('Excluir Acme Corp?')).toBeInTheDocument()
    expect(screen.getByText(/não pode ser desfeita/)).toBeInTheDocument()
  })

  it('DELETEs the workspace and sends the user to create-workspace', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { user } = await openDialog()

    await user.click(confirmButton())

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/create-workspace'),
    )
    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe('/api/workspaces/ws-1')
    expect(call.method).toBe('DELETE')
    expect(await lastToastOutcome()).toEqual({
      type: 'success',
      message: 'Workspace excluído',
    })
  })

  it('sends a single request even if the button is clicked twice', async () => {
    const pending = deferredResponse()
    const fetchSpy = mockFetch().mockReturnValueOnce(pending.promise)
    const { user } = await openDialog()

    await user.click(confirmButton())
    await user.click(confirmButton())

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    pending.resolve(apiSuccess(null))
    await waitFor(() => expect(replace).toHaveBeenCalled())
  })

  it('surfaces the backend message and does not navigate on failure', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(403, 'Apenas o OWNER pode deletar o workspace'),
    )
    const { user } = await openDialog()

    await user.click(confirmButton())

    expect(await lastToastOutcome()).toEqual({
      type: 'error',
      message: 'Apenas o OWNER pode deletar o workspace',
    })
    expect(replace).not.toHaveBeenCalled()
  })

  it('does not call the API when dismissed', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openDialog()

    await user.click(screen.getByRole('button', { name: 'Dispensar' }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('<WorkspaceSettingsDeleteDialog /> with a paid plan or trial', () => {
  it.each([
    'PRO',
    'BUSINESS',
    'ENTERPRISE',
  ] as const)('asks to cancel the subscription first on %s', async (activePlan) => {
    await openDialog({ activePlan })

    expect(
      screen.getByText('Cancele a assinatura primeiro'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Excluir workspace' }),
    ).not.toBeInTheDocument()
  })

  it('takes the user to the billing page instead of deleting', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openDialog({ activePlan: 'PRO' })

    await user.click(
      screen.getByRole('button', { name: 'Ir para a assinatura' }),
    )

    expect(push).toHaveBeenCalledWith('/acme-corp/settings/billing')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
