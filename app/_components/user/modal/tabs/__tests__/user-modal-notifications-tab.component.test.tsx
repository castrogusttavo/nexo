import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import {
  apiError,
  apiSuccess,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { NotificationSettingDTO } from '@/types/notification-setting'
import { UserModalNotificationsTab } from '../user-modal-notifications-tab'

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

const NOTIFICATIONS_URL = '/api/users/me/notifications'

function buildSettings(
  overrides: Partial<NotificationSettingDTO> = {},
): NotificationSettingDTO {
  return {
    priorityChanges: true,
    stateChanges: false,
    comments: true,
    mentions: false,
    ...overrides,
  }
}

type FetchSpy = ReturnType<typeof mockFetch>

// GET returns `settings`; PATCH echoes the patch merged into them, unless
// a custom `patchResponse` is given.
function mockNotificationsApi(
  settings = buildSettings(),
  patchResponse?: () => Response,
) {
  const fetchSpy = mockFetch()
  fetchSpy.mockImplementation(async (_input, init) => {
    if (init?.method === 'PATCH') {
      if (patchResponse) return patchResponse()
      return apiSuccess({ ...settings, ...JSON.parse(String(init.body)) })
    }
    return apiSuccess(settings)
  })
  return fetchSpy
}

function patchCalls(fetchSpy: FetchSpy) {
  return fetchSpy.mock.calls
    .map((_, index) => getFetchCall(fetchSpy, index))
    .filter((call) => call.method === 'PATCH')
}

function renderTab() {
  return renderWithProviders(
    <Tabs value='notifications'>
      <UserModalNotificationsTab tab='notifications' />
    </Tabs>,
  )
}

const optionSwitch = (name: string) => screen.getByRole('switch', { name })

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

describe('<UserModalNotificationsTab />', () => {
  it('shows skeletons until the settings load', async () => {
    const deferred = deferredResponse()
    mockFetch().mockReturnValueOnce(deferred.promise)
    renderTab()

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()

    deferred.resolve(apiSuccess(buildSettings()))
    expect(
      await screen.findByText('Notificações por e-mail'),
    ).toBeInTheDocument()
  })

  it('renders every option as a switch reflecting the stored value', async () => {
    const fetchSpy = mockNotificationsApi()
    renderTab()

    await screen.findByText('Notificações por e-mail')
    expect(getFetchCall(fetchSpy).url).toBe(NOTIFICATIONS_URL)
    expect(optionSwitch('Alterações de propriedade')).toBeChecked()
    expect(optionSwitch('Mudança de estado')).not.toBeChecked()
    expect(optionSwitch('Comentários')).toBeChecked()
    expect(optionSwitch('Menções')).not.toBeChecked()
  })

  it('patches only the toggled option and confirms the save', async () => {
    const fetchSpy = mockNotificationsApi()
    const { user } = renderTab()

    await screen.findByText('Notificações por e-mail')
    await user.click(optionSwitch('Menções'))

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0]).toEqual({
      url: NOTIFICATIONS_URL,
      method: 'PATCH',
      body: { mentions: true },
    })
    expect(optionSwitch('Menções')).toBeChecked()
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Preferências de notificação atualizadas',
      ),
    )
  })

  it('turns an enabled option off', async () => {
    const fetchSpy = mockNotificationsApi()
    const { user } = renderTab()

    await screen.findByText('Notificações por e-mail')
    await user.click(optionSwitch('Comentários'))

    await waitFor(() => expect(patchCalls(fetchSpy)).toHaveLength(1))
    expect(patchCalls(fetchSpy)[0].body).toEqual({ comments: false })
  })

  it('rolls the toggle back and reports the error when saving fails', async () => {
    mockNotificationsApi(buildSettings(), () =>
      apiError(500, 'Não foi possível salvar'),
    )
    const { user } = renderTab()

    await screen.findByText('Notificações por e-mail')
    await user.click(optionSwitch('Menções'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar'),
    )
    await waitFor(() => expect(optionSwitch('Menções')).not.toBeChecked())
  })
})
