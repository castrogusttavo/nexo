import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { Tabs } from '@/components/ui/tabs'
import { expectNoA11yViolations } from '@/src/__tests__/helpers/a11y'
import {
  apiSuccess,
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

// The tab renders inside the account modal, which owns the dialog landmark
// and the heading structure.
const FRAGMENT_RULES = ['region', 'page-has-heading-one', 'landmark-one-main']

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

function mockPreferencesApi(prefs = buildPreferences()) {
  return mockFetch().mockImplementation(async (_input, init) => {
    if (init?.method === 'PATCH')
      return apiSuccess({ ...prefs, ...JSON.parse(String(init.body)) })
    return apiSuccess(prefs)
  })
}

async function renderTab() {
  const utils = renderWithProviders(
    <Tabs value='preferences'>
      <UserModalPreferencesTab tab='preferences' />
    </Tabs>,
  )
  await screen.findByText('Preferências')
  return utils
}

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('<UserModalPreferencesTab /> accessibility', () => {
  it('has no violations with the preferences loaded', async () => {
    mockPreferencesApi()
    const { container } = await renderTab()

    await screen.findByRole('switch', { name: 'Cursor Suave' })

    await expectNoA11yViolations(container, { disabledRules: FRAGMENT_RULES })
  })

  it('has no violations with the theme menu open', async () => {
    mockPreferencesApi()
    const { user } = await renderTab()

    await user.click(await screen.findByRole('combobox', { name: 'Tema' }))
    await screen.findByRole('option', { name: /escuro/i })

    // The listbox is portalled outside the render container, so scan the
    // whole document body.
    await expectNoA11yViolations(document.body, {
      disabledRules: [
        ...FRAGMENT_RULES,
        // TODO(a11y): aria-hidden-focus — Base UI wraps every popup in
        // `data-base-ui-focus-guard` spans that are aria-hidden yet keep
        // tabindex="0". This comes from the library, not from app code.
        'aria-hidden-focus',
      ],
    })
  })
})
