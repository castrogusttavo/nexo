import { screen, waitFor, within } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import {
  apiError,
  apiSuccess,
  createTestQueryClient,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserDTO } from '@/types/user'
import { UserModalProfileTab } from '../user-modal-profile-tab'

const { useSession, refetch, signOut, push } = vi.hoisted(() => ({
  useSession: vi.fn(),
  refetch: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
}))
vi.mock('@/src/lib/auth-client', () => ({
  authClient: { useSession, signOut },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

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

// next/image needs the Next runtime loader; a plain <img> is enough here.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

// The cover picker has its own upload/update flow; out of scope here.
vi.mock('../../user-modal-coverimage-dialog', () => ({
  UserCoverImagePicker: () => null,
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

const USER: UserDTO = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  username: 'ana',
  emailVerified: true,
  image: null,
  coverImage: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  deletionScheduledAt: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  onboardingStep: null,
  role: null,
  goals: [],
  memberships: [],
}

// The tab seeds its inputs from `useUser()` on first render, as it does in
// the app where the user query is already warm when the modal opens.
function renderTab() {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(['user', USER.id], USER)
  return renderWithProviders(
    <Tabs value='profile'>
      <UserModalProfileTab tab='profile' />
    </Tabs>,
    { queryClient },
  )
}

// Labels are not bound to their inputs (no htmlFor); go through the Field.
function fieldControl(label: RegExp) {
  const field = screen
    .getByText(label, { selector: 'label' })
    .closest('[data-slot="field"]')
  if (!(field instanceof HTMLElement)) throw new Error(`No field for ${label}`)
  return within(field).getByRole('textbox')
}

const nameInput = () => fieldControl(/Nome completo/)
const usernameInput = () => fieldControl(/Nome de exibição/)
const saveButton = () =>
  screen.getByRole('button', { name: 'Salvar alterações' })

beforeEach(() => {
  refetch.mockReset().mockResolvedValue(undefined)
  signOut.mockReset().mockResolvedValue(undefined)
  push.mockReset()
  useSession.mockReturnValue({ data: { user: { id: USER.id } }, refetch })
})

describe('<UserModalProfileTab /> profile form', () => {
  it('prefills the profile and keeps save disabled while pristine', () => {
    renderTab()

    expect(nameInput()).toHaveValue('Ana Souza')
    expect(usernameInput()).toHaveValue('ana')
    expect(fieldControl(/E-mail/)).toHaveValue('ana@example.com')
    expect(fieldControl(/E-mail/)).toBeDisabled()
    expect(saveButton()).toBeDisabled()
  })

  it('re-disables save when the edit is reverted', async () => {
    const { user } = renderTab()

    await user.type(usernameInput(), 'x')
    expect(saveButton()).toBeEnabled()
    await user.type(usernameInput(), '{Backspace}')
    expect(saveButton()).toBeDisabled()
  })

  it('patches only the changed field and refreshes the session', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ ...USER, name: 'Ana Lima' }),
    )
    const { user } = renderTab()

    await user.clear(nameInput())
    await user.type(nameInput(), 'Ana Lima')
    await user.click(saveButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy)).toEqual({
      url: '/api/users/me',
      method: 'PATCH',
      body: { name: 'Ana Lima' },
    })
    await expect(lastToastOutcome()).resolves.toMatchObject({
      type: 'success',
    })
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('sends both fields when both changed', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(apiSuccess(USER))
    const { user } = renderTab()

    await user.type(nameInput(), ' Lima')
    await user.clear(usernameInput())
    await user.type(usernameInput(), 'analima')
    await user.click(saveButton())

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(getFetchCall(fetchSpy).body).toEqual({
      name: 'Ana Souza Lima',
      username: 'analima',
    })
  })

  it('surfaces the backend error without refreshing the session', async () => {
    mockFetch().mockResolvedValueOnce(
      apiError(409, 'Nome de exibição já está em uso', 'CONFLICT'),
    )
    const { user } = renderTab()

    await user.type(usernameInput(), '2')
    await user.click(saveButton())

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Nome de exibição já está em uso',
    })
    expect(refetch).not.toHaveBeenCalled()
    await waitFor(() => expect(saveButton()).toBeEnabled())
  })

  it('disables save while the update is pending', async () => {
    mockFetch().mockReturnValueOnce(new Promise<Response>(() => {}))
    const { user } = renderTab()

    await user.type(usernameInput(), '2')
    await user.click(saveButton())

    await waitFor(() => expect(saveButton()).toBeDisabled())
  })
})

describe('<UserModalProfileTab /> avatar', () => {
  it('uploads the chosen avatar as multipart form data', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ url: 'https://cdn.example.com/a.png' }),
    )
    const { user, container } = renderTab()

    const fileInput =
      container.ownerDocument.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('No input')
    const file = new File(['png'], 'me.png', { type: 'image/png' })
    await user.upload(fileInput, file)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const { url, method, body } = getFetchCall(fetchSpy)
    expect(url).toBe('/api/users/me/avatar')
    expect(method).toBe('POST')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('avatars')).toBe(file)
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Avatar atualizado',
    })
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})

describe('<UserModalProfileTab /> account deactivation', () => {
  it('deactivates the account after confirmation, then signs out', async () => {
    const fetchSpy = mockFetch().mockResolvedValue(
      apiSuccess({ scheduleAt: '2026-10-19T00:00:00.000Z' }),
    )
    const { user } = renderTab()

    await user.click(screen.getByRole('button', { name: 'Desativar conta' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(fetchSpy).not.toHaveBeenCalled()
    await user.click(
      within(dialog).getByRole('button', { name: 'Desativar conta' }),
    )

    await waitFor(() => expect(push).toHaveBeenCalledWith('/sign-in'))
    expect(getFetchCall(fetchSpy)).toMatchObject({
      url: '/api/users/me',
      method: 'DELETE',
    })
    expect(signOut).toHaveBeenCalledTimes(1)
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'success',
      message: 'Conta desativada. Você será desconectado',
    })
  })

  it('stays signed in when deactivation fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Falha ao desativar'))
    const { user } = renderTab()

    await user.click(screen.getByRole('button', { name: 'Desativar conta' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Desativar conta' }),
    )

    await waitFor(() => expect(toast.promise).toHaveBeenCalled())
    await expect(lastToastOutcome()).resolves.toEqual({
      type: 'error',
      message: 'Falha ao desativar',
    })
    expect(signOut).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
