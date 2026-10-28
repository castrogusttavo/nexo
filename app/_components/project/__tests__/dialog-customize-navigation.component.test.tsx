import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeUserPreferenceDTO } from '@/src/__tests__/factories/user-preference.factory'
import {
  apiError,
  apiSuccess,
  createTestQueryClient,
  deferredResponse,
  getFetchCall,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import {
  DEFAULT_SIDEBAR_NAVIGATION,
  type SidebarNavigation,
} from '@/src/schemas/user-preference.schema'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { DialogCustomizeNavigation } from '../dialog-customize-navigation'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

const PREFERENCE_KEY = ['user-preferences']
const PREFS_URL = '/api/users/me/preferences'

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

// Seeded before mount: the query is fresh, so every request the test sees
// is a PATCH sent by the dialog.
async function openDialog(
  navigation: SidebarNavigation = DEFAULT_SIDEBAR_NAVIGATION,
) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData<UserPreferenceDTO>(
    PREFERENCE_KEY,
    createFakeUserPreferenceDTO({ navigation }),
  )
  const utils = renderWithProviders(<DialogCustomizeNavigation />, {
    queryClient,
  })
  await utils.user.click(
    screen.getByRole('button', { name: 'Opções de exibição' }),
  )
  return { ...utils, dialog: await screen.findByRole('dialog') }
}

const checkbox = (name: string) => screen.getByRole('checkbox', { name })
const LIMIT_TOGGLE = 'Mostrar projetos limitados na barra lateral'
const LIMIT_INPUT = 'Quantidade de projetos na barra lateral'

describe('DialogCustomizeNavigation', () => {
  it('names the dialog by its title', async () => {
    const { dialog } = await openDialog()

    expect(dialog).toHaveAccessibleName('Personalizar navegação')
  })

  it('lists the items in the stored order with their visibility', async () => {
    const { dialog } = await openDialog({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: [
        { id: 'stickies', visible: false },
        { id: 'drafts', visible: true },
        { id: 'your-work', visible: true },
      ],
    })

    // Rendered order follows the stored order, not the default one.
    const all = within(dialog).getAllByRole('checkbox')
    const positions = ['Notas adesivas', 'Rascunhos', 'Seu trabalho']
      .map(checkbox)
      .map((el) => all.indexOf(el))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(checkbox('Notas adesivas')).not.toBeChecked()
    expect(checkbox('Rascunhos')).toBeChecked()
  })

  it('lists every workspace item, but never Projetos or Página inicial', async () => {
    await openDialog()

    for (const name of [
      'Visualizações',
      'Ciclos',
      'Análises',
      'Arquivados',
      'Dashboards',
    ]) {
      expect(checkbox(name)).toBeChecked()
    }
    expect(screen.queryByRole('checkbox', { name: 'Projetos' })).toBeNull()
    expect(
      screen.queryByRole('checkbox', { name: 'Página inicial' }),
    ).toBeNull()
  })

  it('offers a reorder handle per item', async () => {
    await openDialog()

    expect(screen.getByLabelText('Reordenar Rascunhos')).toBeInTheDocument()
    expect(screen.getByLabelText('Reordenar Dashboards')).toBeInTheDocument()
  })

  it('saves the whole navigation with the item hidden', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(createFakeUserPreferenceDTO()),
    )
    const { user } = await openDialog()

    await user.click(checkbox('Rascunhos'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy)).toEqual({
      url: PREFS_URL,
      method: 'PATCH',
      body: {
        navigation: {
          ...DEFAULT_SIDEBAR_NAVIGATION,
          personal: [
            { id: 'drafts', visible: false },
            { id: 'your-work', visible: true },
            { id: 'stickies', visible: true },
          ],
        },
      },
    })
  })

  it('unchecks the item before the server answers', async () => {
    const response = deferredResponse()
    mockFetch().mockReturnValueOnce(response.promise)
    const { user } = await openDialog()

    await user.click(checkbox('Ciclos'))

    await waitFor(() => expect(checkbox('Ciclos')).not.toBeChecked())
    response.resolve(apiSuccess(createFakeUserPreferenceDTO()))
  })

  it('checks a hidden item back', async () => {
    const fetchSpy = mockFetch().mockResolvedValueOnce(
      apiSuccess(createFakeUserPreferenceDTO()),
    )
    const { user } = await openDialog({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      workspace: DEFAULT_SIDEBAR_NAVIGATION.workspace.map((i) =>
        i.id === 'dashboards' ? { ...i, visible: false } : i,
      ),
    })

    await user.click(checkbox('Dashboards'))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(getFetchCall(fetchSpy).body.navigation.workspace).toEqual(
      DEFAULT_SIDEBAR_NAVIGATION.workspace,
    )
  })

  it('restores the checkbox when the save fails', async () => {
    mockFetch().mockResolvedValueOnce(apiError(500, 'Erro no servidor'))
    const { user } = await openDialog()

    await user.click(checkbox('Rascunhos'))

    await waitFor(() => expect(checkbox('Rascunhos')).toBeChecked())
  })

  describe('projects limit', () => {
    it('starts unlimited, without the quantity input', async () => {
      await openDialog()

      expect(checkbox(LIMIT_TOGGLE)).not.toBeChecked()
      expect(screen.queryByLabelText(LIMIT_INPUT)).toBeNull()
    })

    it('turns the limit on at 10 projects', async () => {
      // The saved DTO replaces the cache on success, so it echoes the limit.
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess(
          createFakeUserPreferenceDTO({
            navigation: { ...DEFAULT_SIDEBAR_NAVIGATION, projectsLimit: 10 },
          }),
        ),
      )
      const { user } = await openDialog()

      await user.click(checkbox(LIMIT_TOGGLE))

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
      expect(getFetchCall(fetchSpy).body.navigation.projectsLimit).toBe(10)
      expect(screen.getByLabelText(LIMIT_INPUT)).toHaveValue(10)
    })

    it('turns the limit off', async () => {
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess(createFakeUserPreferenceDTO()),
      )
      const { user } = await openDialog({
        ...DEFAULT_SIDEBAR_NAVIGATION,
        projectsLimit: 10,
      })

      await user.click(checkbox(LIMIT_TOGGLE))

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
      expect(getFetchCall(fetchSpy).body.navigation.projectsLimit).toBeNull()
    })

    it('saves a new quantity on blur', async () => {
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess(createFakeUserPreferenceDTO()),
      )
      const { user } = await openDialog({
        ...DEFAULT_SIDEBAR_NAVIGATION,
        projectsLimit: 10,
      })

      const input = screen.getByLabelText(LIMIT_INPUT)
      await user.clear(input)
      await user.type(input, '5')
      // Typing alone does not save: one request per commit, not per key.
      expect(fetchSpy).not.toHaveBeenCalled()
      await user.tab()

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
      expect(getFetchCall(fetchSpy).body.navigation.projectsLimit).toBe(5)
    })

    it('saves a new quantity on Enter', async () => {
      const fetchSpy = mockFetch().mockResolvedValueOnce(
        apiSuccess(createFakeUserPreferenceDTO()),
      )
      const { user } = await openDialog({
        ...DEFAULT_SIDEBAR_NAVIGATION,
        projectsLimit: 10,
      })

      const input = screen.getByLabelText(LIMIT_INPUT)
      await user.clear(input)
      await user.type(input, '20{Enter}')

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
      expect(getFetchCall(fetchSpy).body.navigation.projectsLimit).toBe(20)
    })

    it.each([
      '0',
      '51',
    ])('snaps %s back to the saved quantity without a request', async (typed) => {
      const fetchSpy = mockFetch()
      const { user } = await openDialog({
        ...DEFAULT_SIDEBAR_NAVIGATION,
        projectsLimit: 10,
      })

      const input = screen.getByLabelText(LIMIT_INPUT)
      await user.clear(input)
      await user.type(input, typed)
      await user.tab()

      expect(input).toHaveValue(10)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does not save when the quantity did not change', async () => {
      const fetchSpy = mockFetch()
      const { user } = await openDialog({
        ...DEFAULT_SIDEBAR_NAVIGATION,
        projectsLimit: 10,
      })

      await user.click(screen.getByLabelText(LIMIT_INPUT))
      await user.tab()

      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
