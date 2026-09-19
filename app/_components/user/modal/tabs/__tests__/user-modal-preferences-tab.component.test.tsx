import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import {
  apiError,
  apiSuccess,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { UserModalPreferencesTab } from '../user-modal-preferences-tab'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

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

const PREFS_URL = '/api/users/me/preferences'

function buildPreferences(
  overrides: Partial<UserPreferenceDTO> = {},
): UserPreferenceDTO {
  return {
    theme: 'LIGHT',
    smoothCursor: true,
    quickSendShortcut: 'ENTER',
    timezone: 'America/Sao_Paulo',
    weekStartsOn: 0,
    weekendDays: [0, 6],
    ...overrides,
  }
}

type FetchSpy = ReturnType<typeof mockFetch>

// GET returns `prefs`; PATCH echoes the patch merged into `prefs`, unless
// a custom `patchResponse` is given.
function mockPreferencesApi(
  prefs = buildPreferences(),
  patchResponse?: () => Response | Promise<Response>,
) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (_input, init) => {
    if (init?.method === 'PATCH') {
      if (patchResponse) return patchResponse()
      return apiSuccess({ ...prefs, ...JSON.parse(String(init.body)) })
    }
    return apiSuccess(prefs)
  })
  return fetchSpy
}

function patchCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method === 'PATCH')
}

const smoothCursorSwitch = () =>
  screen.getByRole('switch', { name: 'Cursor Suave' })
const themeSelect = () => screen.getByRole('combobox', { name: 'Tema' })
// Menu buttons are named by their field label followed by the current value.
const weekStartButton = () =>
  screen.getByRole('button', { name: /^Primeiro dia da semana/ })
const weekendButton = () =>
  screen.getByRole('button', { name: /^Dias de fim de semana/ })

async function renderTab(fetchSpy = mockPreferencesApi()) {
  const utils = renderWithProviders(
    <Tabs value='preferences'>
      <UserModalPreferencesTab tab='preferences' />
    </Tabs>,
  )
  await screen.findByText('Preferências')
  return { ...utils, fetchSpy }
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('<UserModalPreferencesTab />', () => {
  it('shows a skeleton until the preferences load', async () => {
    let resolve: (res: Response) => void = () => {}
    mockFetch().mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r
      }),
    )
    renderWithProviders(
      <Tabs value='preferences'>
        <UserModalPreferencesTab tab='preferences' />
      </Tabs>,
    )

    expect(screen.queryByText('Preferências')).not.toBeInTheDocument()
    resolve(apiSuccess(buildPreferences()))
    expect(await screen.findByText('Preferências')).toBeInTheDocument()
  })

  it('renders the current preferences on labelled controls', async () => {
    const { fetchSpy } = await renderTab()

    expect(getFetchCall(fetchSpy).url).toBe(PREFS_URL)
    expect(screen.getByRole('combobox', { name: 'Tema' })).toHaveTextContent(
      'Claro',
    )
    expect(
      screen.getByRole('combobox', { name: 'Atalho para enviar comentários' }),
    ).toHaveTextContent('Enter')
    expect(
      screen.getByRole('combobox', { name: 'Fuso horário' }),
    ).toHaveTextContent('America/Sao_Paulo')
    expect(smoothCursorSwitch()).toBeChecked()
    expect(weekStartButton()).toHaveTextContent('Domingo')
    expect(weekendButton()).toHaveTextContent('Dom, Sáb')
  })

  it('prompts to pick weekend days when none are set', async () => {
    await renderTab(mockPreferencesApi(buildPreferences({ weekendDays: [] })))

    expect(weekendButton()).toHaveTextContent(
      'Selecionar dias de fim de semana',
    )
  })

  it('saves the smooth cursor toggle immediately', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(smoothCursorSwitch())

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0]).toEqual({
      url: PREFS_URL,
      method: 'PATCH',
      body: { smoothCursor: false },
    })
    expect(smoothCursorSwitch()).not.toBeChecked()
  })

  it('saves the selected theme and applies it', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(themeSelect())
    await user.click(await screen.findByRole('option', { name: 'Escuro' }))

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ theme: 'DARK' })
    expect(document.documentElement).toHaveClass('dark')
    expect(themeSelect()).toHaveTextContent('Escuro')
  })

  it('saves the comment send shortcut', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(
      screen.getByRole('combobox', { name: 'Atalho para enviar comentários' }),
    )
    await user.click(
      await screen.findByRole('option', { name: 'Ctrl + Enter' }),
    )

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({
      quickSendShortcut: 'CTRL_ENTER',
    })
  })

  it('saves the first day of the week as a number', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(weekStartButton())
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Segunda' }),
    )

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ weekStartsOn: 1 })
    await waitFor(() => expect(weekStartButton()).toHaveTextContent('Segunda'))
  })

  it('adds a weekend day keeping the list sorted', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(weekendButton())
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Sexta' }),
    )

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ weekendDays: [0, 5, 6] })
  })

  it('removes an already selected weekend day', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(weekendButton())
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Domingo' }),
    )

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ weekendDays: [6] })
  })

  it('rolls the change back and shows the error when saving fails', async () => {
    const { user } = await renderTab(
      mockPreferencesApi(buildPreferences(), () =>
        apiError(500, 'Não foi possível salvar'),
      ),
    )

    await user.click(smoothCursorSwitch())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar'),
    )
    await waitFor(() => expect(smoothCursorSwitch()).toBeChecked())
  })
})
