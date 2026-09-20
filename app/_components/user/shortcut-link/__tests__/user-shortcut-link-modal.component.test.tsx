import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { UserShortcutLinkModal } from '../user-shortcut-link-modal'

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

const SHORT_LINK = {
  id: 'link-1',
  title: 'Docs',
  url: 'https://docs.example.com',
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const urlInput = () => screen.getByPlaceholderText('Digite ou cole uma URL')
const titleInput = () =>
  screen.getByPlaceholderText('Como você gostaria de ver este link')
const submitButton = () =>
  screen.getByRole('button', { name: 'Adicionar Link rápido' })

async function openModal() {
  const utils = renderWithProviders(<UserShortcutLinkModal />)
  await utils.user.click(
    screen.getByRole('button', { name: 'Adicionar link rápido' }),
  )
  await screen.findByRole('dialog')
  return utils
}

beforeEach(() => {
  vi.mocked(toast.promise).mockClear()
})

describe('<UserShortcutLinkModal /> validation', () => {
  it('opens on an empty form', async () => {
    await openModal()

    expect(urlInput()).toHaveValue('')
    expect(titleInput()).toHaveValue('')
  })

  it('rejects an empty submission without calling the API', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openModal()

    await user.click(submitButton())

    expect(
      screen.getByText('O título deve ter pelo menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(screen.getByText('URL inválida')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a one-character title', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openModal()

    await user.type(urlInput(), 'https://docs.example.com')
    await user.type(titleInput(), ' D ')
    await user.click(submitButton())

    expect(
      screen.getByText('O título deve ter pelo menos 2 caracteres'),
    ).toBeInTheDocument()
    expect(screen.queryByText('URL inválida')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a url the browser cannot parse', async () => {
    const fetchSpy = mockFetch()
    const { user } = await openModal()

    await user.type(urlInput(), 'docs.example.com')
    await user.type(titleInput(), 'Docs')
    await user.click(submitButton())

    expect(screen.getByText('URL inválida')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('clears the previous errors on the next submission', async () => {
    mockFetch().mockResolvedValue(apiSuccess(SHORT_LINK, 201))
    const { user } = await openModal()

    await user.click(submitButton())
    expect(screen.getByText('URL inválida')).toBeInTheDocument()

    await user.type(urlInput(), 'https://docs.example.com')
    await user.type(titleInput(), 'Docs')
    await user.click(submitButton())

    await waitFor(() =>
      expect(screen.queryByText('URL inválida')).not.toBeInTheDocument(),
    )
  })
})

describe('<UserShortcutLinkModal /> submission', () => {
  it('posts the trimmed title with the url and closes the dialog', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(SHORT_LINK, 201))
    const { user } = await openModal()

    await user.type(urlInput(), 'https://docs.example.com')
    await user.type(titleInput(), '  Docs  ')
    await user.click(submitButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/short-links',
      method: 'POST',
      body: { title: 'Docs', url: 'https://docs.example.com' },
    })
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Link rápido criado',
    })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('keeps the dialog and the draft when the request fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(409, 'Link rápido duplicado'))
    const { user } = await openModal()

    await user.type(urlInput(), 'https://docs.example.com')
    await user.type(titleInput(), 'Docs')
    await user.click(submitButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Link rápido duplicado',
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(titleInput()).toHaveValue('Docs')
  })

  it('disables the form while the request is pending', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = await openModal()

    await user.type(urlInput(), 'https://docs.example.com')
    await user.type(titleInput(), 'Docs')
    await user.click(submitButton())

    await waitFor(() => expect(submitButton()).toBeDisabled())
    expect(urlInput()).toBeDisabled()
    expect(titleInput()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })

  it('resets the draft and the errors when cancelled and reopened', async () => {
    const { user } = await openModal()

    await user.type(urlInput(), 'nope')
    await user.type(titleInput(), 'Docs')
    await user.click(submitButton())
    expect(screen.getByText('URL inválida')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    await user.click(
      screen.getByRole('button', { name: 'Adicionar link rápido' }),
    )
    await screen.findByRole('dialog')
    expect(urlInput()).toHaveValue('')
    expect(titleInput()).toHaveValue('')
    expect(screen.queryByText('URL inválida')).not.toBeInTheDocument()
  })
})
