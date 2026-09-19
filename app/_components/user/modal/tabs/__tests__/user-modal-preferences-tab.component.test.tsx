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

  it('renders the current preferences', async () => {
    const { fetchSpy } = await renderTab()

    expect(getFetchCall(fetchSpy).url).toBe(PREFS_URL)
    const [theme, shortcut, timezone] = screen.getAllByRole('combobox')
    expect(theme).toHaveTextContent('Claro')
    expect(shortcut).toHaveTextContent('Enter')
    expect(timezone).toHaveTextContent('America/Sao_Paulo')
    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Domingo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dom, Sáb' })).toBeInTheDocument()
  })

  it('prompts to pick weekend days when none are set', async () => {
    await renderTab(mockPreferencesApi(buildPreferences({ weekendDays: [] })))

    expect(
      screen.getByRole('button', { name: 'Selecionar dias de fim de semana' }),
    ).toBeInTheDocument()
  })

  it('saves the smooth cursor toggle immediately', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(screen.getByRole('switch'))

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0]).toEqual({
      url: PREFS_URL,
      method: 'PATCH',
      body: { smoothCursor: false },
    })
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('saves the selected theme and applies it', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(screen.getAllByRole('combobox')[0])
    await user.click(await screen.findByRole('option', { name: 'Escuro' }))

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ theme: 'DARK' })
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Escuro')
  })

  it('saves the comment send shortcut', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(screen.getAllByRole('combobox')[1])
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

    await user.click(screen.getByRole('button', { name: 'Domingo' }))
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Segunda' }),
    )

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ weekStartsOn: 1 })
    expect(
      await screen.findByRole('button', { name: 'Segunda' }),
    ).toBeInTheDocument()
  })

  it('adds a weekend day keeping the list sorted', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(screen.getByRole('button', { name: 'Dom, Sáb' }))
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Sexta' }),
    )

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ weekendDays: [0, 5, 6] })
  })

  it('removes an already selected weekend day', async () => {
    const { user, fetchSpy } = await renderTab()

    await user.click(screen.getByRole('button', { name: 'Dom, Sáb' }))
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

    await user.click(screen.getByRole('switch'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar'),
    )
    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked())
  })
})
