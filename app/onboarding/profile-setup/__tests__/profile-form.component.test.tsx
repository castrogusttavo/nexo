import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { ProfileForm } from '../profile-form'

const { saveProfileSetup, toastPromise } = vi.hoisted(() => ({
  saveProfileSetup: vi.fn(),
  toastPromise: vi.fn(),
}))

// Server action stub: the form only depends on its state contract.
vi.mock('../actions', () => ({ saveProfileSetup }))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { twoFactor: { enable: vi.fn(), disable: vi.fn() } },
}))
vi.mock('sonner', () => ({ toast: { promise: toastPromise } }))

const DEFAULT_PROPS = {
  name: 'Ana Souza',
  image: null,
  twoFactorEnabled: false,
  hasPassword: true,
}

const nameInput = () => screen.getByRole('textbox', { name: /nome/i })
const submitButton = () => screen.getByRole('button', { name: 'Continuar' })

function fileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('avatar file input not found')
  return input
}

/** The `error` resolver notify.mutate hands to sonner for the upload toast. */
function toastErrorMessage(err: unknown) {
  const options = toastPromise.mock.calls[0]?.[1]
  return options.error(err)
}

beforeEach(() => {
  saveProfileSetup.mockResolvedValue({ ok: true })
})

describe('<ProfileForm />', () => {
  it('prefills the name and shows its initials as the avatar fallback', () => {
    renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    expect(nameInput()).toHaveValue('Ana Souza')
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('updates the initials as the name changes', async () => {
    const { user } = renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    await user.clear(nameInput())
    expect(screen.getByText('??')).toBeInTheDocument()
    await user.type(nameInput(), 'beatriz lima costa')

    expect(screen.getByText('BL')).toBeInTheDocument()
  })

  it('disables continue for names shorter than 2 characters', async () => {
    const { user } = renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    await user.clear(nameInput())
    await user.type(nameInput(), ' B ')
    expect(submitButton()).toBeDisabled()

    await user.type(nameInput(), 'e')
    expect(submitButton()).toBeEnabled()
  })

  it('submits the name and the marketing opt-in (checked by default)', async () => {
    const { user } = renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    await user.click(submitButton())

    await waitFor(() => expect(saveProfileSetup).toHaveBeenCalled())
    const data: FormData = saveProfileSetup.mock.calls[0]?.[1]
    expect(data.get('name')).toBe('Ana Souza')
    expect(data.get('marketingConsent')).toBe('on')
  })

  it('omits the marketing opt-in once it is unchecked', async () => {
    const { user } = renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    await user.click(
      screen.getByRole('checkbox', { name: /comunicações de marketing/i }),
    )
    await user.click(submitButton())

    await waitFor(() => expect(saveProfileSetup).toHaveBeenCalled())
    const data: FormData = saveProfileSetup.mock.calls[0]?.[1]
    expect(data.get('marketingConsent')).toBeNull()
  })

  it('shows the error returned by the action', async () => {
    saveProfileSetup.mockResolvedValue({
      ok: false,
      error: 'Não foi possível salvar. Tente novamente.',
    })
    const { user } = renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente novamente.',
    )
  })

  it('locks the name and continue while saving', async () => {
    let resolve!: (value: unknown) => void
    saveProfileSetup.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const { user } = renderWithProviders(<ProfileForm {...DEFAULT_PROPS} />)

    await user.click(submitButton())

    await waitFor(() => expect(submitButton()).toBeDisabled())
    expect(nameInput()).toBeDisabled()

    resolve({ ok: false })
    await waitFor(() => expect(submitButton()).toBeEnabled())
  })

  it('renders the two-factor section with the account flags', () => {
    renderWithProviders(
      <ProfileForm {...DEFAULT_PROPS} twoFactorEnabled hasPassword />,
    )

    expect(
      screen.getByRole('button', { name: /verificação em duas etapas/i }),
    ).toHaveTextContent('Ativa')
  })

  describe('avatar upload', () => {
    it('uploads the picked image with a loading toast', async () => {
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess({ url: 'https://cdn.nexo.dev/a.png' }),
      )
      const { user, container } = renderWithProviders(
        <ProfileForm {...DEFAULT_PROPS} />,
      )
      const file = new File(['img'], 'me.png', { type: 'image/png' })

      await user.upload(fileInput(container), file)

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
      const { url, method, body } = getFetchCall(fetchSpy)
      expect(url).toBe('/api/users/me/avatar')
      expect(method).toBe('POST')
      expect((body as FormData).get('avatars')).toBe(file)
      expect(toastPromise).toHaveBeenCalledWith(
        expect.any(Promise),
        expect.objectContaining({
          loading: 'Enviando imagem...',
          success: 'Imagem enviada',
        }),
      )
      await expect(toastPromise.mock.calls[0]?.[0]).resolves.toBeUndefined()
    })

    it('surfaces the server message when the upload is rejected', async () => {
      mockFetch().mockResolvedValueOnce(
        Response.json(
          { success: false, error: { message: 'Arquivo muito grande' } },
          { status: 413 },
        ),
      )
      const { user, container } = renderWithProviders(
        <ProfileForm {...DEFAULT_PROPS} />,
      )

      await user.upload(
        fileInput(container),
        new File(['img'], 'big.png', { type: 'image/png' }),
      )

      await waitFor(() => expect(toastPromise).toHaveBeenCalled())
      const upload = toastPromise.mock.calls[0]?.[0] as Promise<unknown>
      const failure = await upload.catch((err: unknown) => err)
      expect(toastErrorMessage(failure)).toBe('Arquivo muito grande')
    })

    it('falls back to a generic upload error message', async () => {
      mockFetch().mockResolvedValueOnce(apiError(500))
      const { user, container } = renderWithProviders(
        <ProfileForm {...DEFAULT_PROPS} />,
      )

      await user.upload(
        fileInput(container),
        new File(['img'], 'me.png', { type: 'image/png' }),
      )

      await waitFor(() => expect(toastPromise).toHaveBeenCalled())
      const upload = toastPromise.mock.calls[0]?.[0] as Promise<unknown>
      const failure = await upload.catch((err: unknown) => err)
      expect(toastErrorMessage(failure)).toBe('Erro ao enviar imagem')
    })
  })
})
