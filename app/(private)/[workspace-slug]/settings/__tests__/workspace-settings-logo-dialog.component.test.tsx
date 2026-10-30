import { fireEvent, screen, waitFor } from '@testing-library/react'
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
import { WorkspaceSettingsLogoDialog } from '../workspace-settings-logo-dialog'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
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

const LOGO_URL = 'https://silo.example.com/workspace-logos/ws-1/logo.png'

function buildWorkspace(overrides: Partial<WorkspaceDTO> = {}) {
  return buildWorkspaceDTO({ id: 'ws-1', name: 'acme', ...overrides })
}

function png(size = 1024) {
  return new File([new Uint8Array(size)], 'logo.png', { type: 'image/png' })
}

// The dialog renders in a portal and the input is hidden, so it is reached
// through the document rather than a role.
function fileInput() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not rendered')
  return input
}

function choose(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } })
}

const saveButton = () => screen.getByRole('button', { name: 'Enviar e salvar' })

async function openDialog(workspace = buildWorkspace(), canEdit = true) {
  const view = renderWithProviders(
    <WorkspaceSettingsLogoDialog workspace={workspace} canEdit={canEdit} />,
  )
  await view.user.click(screen.getByRole('button'))
  return view
}

beforeEach(() => {
  refresh.mockReset()
  vi.mocked(toast.promise).mockReset()
  vi.mocked(toast.error).mockReset()
  // jsdom has no object URLs; the preview only needs a stable string.
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

describe('<WorkspaceSettingsLogoDialog /> trigger', () => {
  it('shows the first letter of the name when there is no logo', () => {
    renderWithProviders(
      <WorkspaceSettingsLogoDialog
        workspace={buildWorkspace({ name: 'acme' })}
        canEdit
      />,
    )

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows the logo when there is one', () => {
    const { container } = renderWithProviders(
      <WorkspaceSettingsLogoDialog
        workspace={buildWorkspace({ image: LOGO_URL })}
        canEdit
      />,
    )

    expect(container.querySelector('img')).toHaveAttribute('src', LOGO_URL)
  })

  it('renders only the avatar, without a trigger, when the user cannot edit', () => {
    renderWithProviders(
      <WorkspaceSettingsLogoDialog
        workspace={buildWorkspace()}
        canEdit={false}
      />,
    )

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('<WorkspaceSettingsLogoDialog /> picking a file', () => {
  it('starts with nothing to save', async () => {
    await openDialog()

    expect(screen.getByText('Logo do workspace')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('accepts only jpeg, png and webp in the file picker', async () => {
    await openDialog()

    expect(fileInput()).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    )
  })

  it('previews the chosen file and enables saving', async () => {
    await openDialog()

    choose(png())

    await waitFor(() => expect(saveButton()).toBeEnabled())
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('rejects a format outside the whitelist with a toast', async () => {
    await openDialog()

    choose(new File(['gif'], 'a.gif', { type: 'image/gif' }))

    expect(toast.error).toHaveBeenCalledWith(
      'Formato não suportado. Use JPEG, PNG ou WebP',
    )
    expect(saveButton()).toBeDisabled()
  })

  it('rejects a file over 5 MB with a toast and does not keep it', async () => {
    await openDialog()

    choose(png(5 * 1024 * 1024 + 1))

    expect(toast.error).toHaveBeenCalledWith(
      'Arquivo muito grande. Máximo 5 MB',
    )
    expect(saveButton()).toBeDisabled()
  })

  it('accepts a file of exactly 5 MB without any error toast', async () => {
    await openDialog()

    choose(png(5 * 1024 * 1024))

    await waitFor(() => expect(saveButton()).toBeEnabled())
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('accepts a file dropped on the drop zone', async () => {
    await openDialog()
    const zone = screen
      .getByText('Arraste uma imagem ou clique para escolher')
      .closest('button') as HTMLElement

    fireEvent.drop(zone, { dataTransfer: { files: [png()] } })

    await waitFor(() => expect(saveButton()).toBeEnabled())
  })
})

describe('<WorkspaceSettingsLogoDialog /> saving', () => {
  it('POSTs the file under "logo", refreshes and closes the dialog', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess({ url: LOGO_URL }, 201),
    )
    const { user } = await openDialog()
    const file = png()

    choose(file)
    await user.click(saveButton())

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe('/api/workspaces/ws-1/logo')
    expect(call.method).toBe('POST')
    expect((call.body as FormData).get('logo')).toBe(file)
    expect(await lastToastOutcome()).toEqual({
      type: 'success',
      message: 'Logo atualizado',
    })
    await waitFor(() =>
      expect(screen.queryByText('Logo do workspace')).not.toBeInTheDocument(),
    )
  })

  it('disables the actions while the upload is in flight', async () => {
    const pending = deferredResponse()
    mockFetch().mockReturnValueOnce(pending.promise)
    const { user } = await openDialog()

    choose(png())
    await user.click(saveButton())

    await waitFor(() => expect(saveButton()).toBeDisabled())
    pending.resolve(apiSuccess({ url: LOGO_URL }, 201))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('reports an upload failure as an upload failure and stays open', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(500, 'Falha ao armazena o arquivo'),
    )
    const { user } = await openDialog()

    choose(png())
    await user.click(saveButton())

    expect(await lastToastOutcome()).toEqual({
      type: 'error',
      message: 'Falha ao armazena o arquivo',
    })
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByText('Logo do workspace')).toBeInTheDocument()
  })

  it('discards the chosen file when cancelled', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openDialog()
    choose(png())

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button'))

    expect(saveButton()).toBeDisabled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('<WorkspaceSettingsLogoDialog /> removing', () => {
  it('has no remove button when there is no logo', async () => {
    await openDialog(buildWorkspace({ image: null }))

    expect(
      screen.queryByRole('button', { name: 'Remover' }),
    ).not.toBeInTheDocument()
  })

  it('DELETEs the logo, refreshes and closes the dialog', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(apiSuccess(null))
    const { user } = await openDialog(buildWorkspace({ image: LOGO_URL }))

    await user.click(screen.getByRole('button', { name: 'Remover' }))

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    const call = getFetchCall(fetchSpy)
    expect(call.url).toBe('/api/workspaces/ws-1/logo')
    expect(call.method).toBe('DELETE')
    expect(await lastToastOutcome()).toEqual({
      type: 'success',
      message: 'Logo removido',
    })
  })

  it('surfaces the backend message and stays open when removing fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(403, 'Sem permissão'))
    const { user } = await openDialog(buildWorkspace({ image: LOGO_URL }))

    await user.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await lastToastOutcome()).toEqual({
      type: 'error',
      message: 'Sem permissão',
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
