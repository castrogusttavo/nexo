import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeUserPreferenceDTO } from '@/src/__tests__/factories/user-preference.factory'
import {
  apiSuccess,
  createTestQueryClient,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { HomeWidgets } from '@/src/schemas/user-preference.schema'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { HomeWidgetList } from '../home-widget-list'
import { HomeWidgetsDialog } from '../home-widgets-dialog'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const PREFERENCE_KEY = ['user-preferences']
const PREFS_URL = '/api/users/me/preferences'

const STORED: HomeWidgets = [
  { id: 'stickies', visible: true },
  { id: 'quick-links', visible: true },
  { id: 'recents', visible: false },
]

const WIDGETS = {
  'quick-links': <section>Widget links</section>,
  recents: <section>Widget recentes</section>,
  stickies: <section>Widget anotações</section>,
}

describe('<HomeWidgetList />', () => {
  // No session: the preference query stays idle, so the list renders from
  // the server's initial value alone, as it does on the first frame.
  beforeEach(() => {
    useSession.mockReturnValue({ data: null })
  })

  it('shows the visible widgets in the stored order', () => {
    renderWithProviders(
      <HomeWidgetList initialWidgets={STORED} widgets={WIDGETS} />,
    )

    expect(
      screen.getAllByText(/^Widget /).map((node) => node.textContent),
    ).toEqual(['Widget anotações', 'Widget links'])
  })

  it('follows the cached preference over the initial value', () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData<UserPreferenceDTO>(
      PREFERENCE_KEY,
      createFakeUserPreferenceDTO({
        homeWidgets: [
          { id: 'recents', visible: true },
          { id: 'stickies', visible: false },
          { id: 'quick-links', visible: false },
        ],
      }),
    )

    renderWithProviders(
      <HomeWidgetList initialWidgets={STORED} widgets={WIDGETS} />,
      { queryClient },
    )

    expect(
      screen.getAllByText(/^Widget /).map((node) => node.textContent),
    ).toEqual(['Widget recentes'])
  })

  it('points the way back when every widget is hidden', () => {
    renderWithProviders(
      <HomeWidgetList
        initialWidgets={STORED.map((w) => ({ ...w, visible: false }))}
        widgets={WIDGETS}
      />,
    )

    expect(screen.queryByText(/^Widget /)).not.toBeInTheDocument()
    expect(screen.getByText(/Gerenciar widgets/)).toBeInTheDocument()
  })
})

describe('<HomeWidgetsDialog />', () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  // Seeded before mount: the query is fresh, so every request the test sees
  // is a PATCH sent by the dialog.
  async function openDialog(homeWidgets: HomeWidgets = STORED) {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData<UserPreferenceDTO>(
      PREFERENCE_KEY,
      createFakeUserPreferenceDTO({ homeWidgets }),
    )
    const utils = renderWithProviders(<HomeWidgetsDialog />, { queryClient })
    await utils.user.click(
      screen.getByRole('button', { name: 'Gerenciar widgets' }),
    )
    return { ...utils, dialog: await screen.findByRole('dialog') }
  }

  it('names the dialog by its title', async () => {
    const { dialog } = await openDialog()

    expect(dialog).toHaveAccessibleName('Gerenciar widgets')
  })

  it('lists every widget in the stored order with its visibility', async () => {
    const { dialog } = await openDialog()

    const all = within(dialog).getAllByRole('switch')
    const positions = ['Suas anotações', 'Links rápidos', 'Recentes']
      .map((name) => within(dialog).getByRole('switch', { name }))
      .map((el) => all.indexOf(el))
    expect(positions).toEqual([0, 1, 2])
    expect(
      within(dialog).getByRole('switch', { name: 'Suas anotações' }),
    ).toBeChecked()
    expect(
      within(dialog).getByRole('switch', { name: 'Recentes' }),
    ).not.toBeChecked()
  })

  it('offers a reorder handle per widget', async () => {
    const { dialog } = await openDialog()

    for (const label of ['Links rápidos', 'Recentes', 'Suas anotações']) {
      expect(
        within(dialog).getByLabelText(`Reordenar ${label}`),
      ).toBeInTheDocument()
    }
  })

  it('saves every widget, with the one switched off hidden', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(createFakeUserPreferenceDTO()),
    )
    const { user, dialog } = await openDialog()

    await user.click(
      within(dialog).getByRole('switch', { name: 'Links rápidos' }),
    )

    expect(getFetchCall(fetchSpy)).toEqual({
      url: PREFS_URL,
      method: 'PATCH',
      body: {
        homeWidgets: [
          { id: 'stickies', visible: true },
          { id: 'quick-links', visible: false },
          { id: 'recents', visible: false },
        ],
      },
    })
  })

  it('switches a widget off before the server answers', async () => {
    mockFetch().mockReturnValueOnce(new Promise(() => {}))
    const { user, dialog } = await openDialog()
    const quickLinks = within(dialog).getByRole('switch', {
      name: 'Links rápidos',
    })

    await user.click(quickLinks)

    expect(quickLinks).not.toBeChecked()
  })
})
