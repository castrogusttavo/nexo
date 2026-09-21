import { screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ProjectFilterButton } from '../workspace-project-filter-button'

// A viewer west of UTC, like most of the product's users: the day a picked
// date names must survive the round trip through the query string.
const originalTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/Sao_Paulo'
})
afterAll(() => {
  process.env.TZ = originalTz
})

beforeEach(() => {
  // Only Date is faked so the calendar always opens on September 2026;
  // timers stay real for user-event.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 10, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderButton(searchParams?: Record<string, string>) {
  return renderWithProviders(<ProjectFilterButton />, { searchParams })
}

const trigger = () => screen.getByRole('button', { name: /Filtros/ })

/** The badge the trigger shows next to "Filtros", or '' when there is none. */
const activeCount = () => trigger().textContent?.replace('Filtros', '') ?? ''

async function openMenu(user: ReturnType<typeof renderButton>['user']) {
  await user.click(trigger())
  return within(await screen.findByRole('menu'))
}

const isChecked = (item: HTMLElement) =>
  item.getAttribute('aria-checked') === 'true'

/**
 * The custom-range row. Its label is the value under test (it swaps between
 * "Customizar" and the picked days), so it is found by its popover role
 * rather than by name.
 */
function dateTrigger() {
  const el = document.querySelector('[data-slot="popover-trigger"]')
  if (!(el instanceof HTMLElement)) throw new Error('No custom range trigger')
  return el
}

describe('<ProjectFilterButton /> active count', () => {
  it('shows no badge while nothing is filtered', () => {
    renderButton()

    expect(activeCount()).toBe('')
  })

  it('counts each filter group once, however many values it holds', () => {
    renderButton({
      mine: 'true',
      access: 'public,private',
      createdAt: 'today',
    })

    expect(activeCount()).toBe('3')
  })

  it('counts a custom range as the date filter', () => {
    renderButton({ dateFrom: '2026-09-20' })

    expect(activeCount()).toBe('1')
  })
})

describe('<ProjectFilterButton /> ownership', () => {
  it('claims only the projects the viewer leads', async () => {
    const { user } = renderButton()

    const menu = await openMenu(user)
    const mine = menu.getByRole('menuitemcheckbox', { name: 'Meus projetos' })
    expect(isChecked(mine)).toBe(false)

    await user.click(mine)

    await waitFor(() => expect(isChecked(mine)).toBe(true))
    expect(activeCount()).toBe('1')
  })

  it('gives the claim back', async () => {
    const { user } = renderButton({ mine: 'true' })

    const menu = await openMenu(user)
    await user.click(
      menu.getByRole('menuitemcheckbox', { name: 'Meus projetos' }),
    )

    await waitFor(() => expect(activeCount()).toBe(''))
  })
})

describe('<ProjectFilterButton /> access', () => {
  it('adds an access without dropping the other', async () => {
    const { user } = renderButton({ access: 'public' })

    const menu = await openMenu(user)
    const privateItem = menu.getByRole('menuitemcheckbox', { name: 'Privado' })
    await user.click(privateItem)

    await waitFor(() => expect(isChecked(privateItem)).toBe(true))
    expect(
      isChecked(menu.getByRole('menuitemcheckbox', { name: 'Público' })),
    ).toBe(true)
    // Both accesses are still the one "access" filter.
    expect(activeCount()).toBe('1')
  })

  it('removes an access that was already picked', async () => {
    const { user } = renderButton({ access: 'public,private' })

    const menu = await openMenu(user)
    await user.click(menu.getByRole('menuitemcheckbox', { name: 'Público' }))

    await waitFor(() =>
      expect(
        isChecked(menu.getByRole('menuitemcheckbox', { name: 'Público' })),
      ).toBe(false),
    )
    expect(
      isChecked(menu.getByRole('menuitemcheckbox', { name: 'Privado' })),
    ).toBe(true)
    expect(activeCount()).toBe('1')
  })

  it('clears the access filter once the last one is unpicked', async () => {
    const { user } = renderButton({ access: 'private' })

    const menu = await openMenu(user)
    await user.click(menu.getByRole('menuitemcheckbox', { name: 'Privado' }))

    await waitFor(() => expect(activeCount()).toBe(''))
  })
})

describe('<ProjectFilterButton /> creation date', () => {
  it('offers the four presets', async () => {
    const { user } = renderButton()

    const menu = await openMenu(user)

    expect(
      menu.getAllByRole('menuitemradio').map((item) => item.textContent),
    ).toEqual(['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias'])
  })

  it('marks the preset coming from the url', async () => {
    const { user } = renderButton({ createdAt: '7days' })

    const menu = await openMenu(user)

    expect(
      isChecked(menu.getByRole('menuitemradio', { name: 'Últimos 7 dias' })),
    ).toBe(true)
  })

  it('picks a preset', async () => {
    const { user } = renderButton()

    const menu = await openMenu(user)
    const preset = menu.getByRole('menuitemradio', { name: 'Ontem' })
    await user.click(preset)

    await waitFor(() => expect(isChecked(preset)).toBe(true))
    expect(activeCount()).toBe('1')
  })

  it('replaces a custom range when a preset is picked', async () => {
    const { user } = renderButton({ dateFrom: '2026-09-20' })

    const menu = await openMenu(user)
    expect(dateTrigger()).toHaveTextContent('20/09/26')

    await user.click(menu.getByRole('menuitemradio', { name: 'Hoje' }))

    await waitFor(() => expect(dateTrigger()).toHaveTextContent('Customizar'))
    expect(activeCount()).toBe('1')
  })

  it('drops the preset as soon as the custom range is opened', async () => {
    const { user } = renderButton({ createdAt: 'today' })

    const menu = await openMenu(user)
    await user.click(dateTrigger())

    await waitFor(() =>
      expect(isChecked(menu.getByRole('menuitemradio', { name: 'Hoje' }))).toBe(
        false,
      ),
    )
  })
})

describe('<ProjectFilterButton /> custom range', () => {
  it('labels a stored single day', async () => {
    const { user } = renderButton({ dateFrom: '2026-09-20' })

    await openMenu(user)

    expect(dateTrigger()).toHaveTextContent('20/09/26')
  })

  it('labels a stored range with both ends', async () => {
    const { user } = renderButton({
      dateFrom: '2026-09-18',
      dateTo: '2026-09-20',
    })

    await openMenu(user)

    expect(dateTrigger()).toHaveTextContent('18/09/26 – 20/09/26')
  })

  it('labels the picked day with that same calendar day', async () => {
    const { user } = renderButton()

    await openMenu(user)
    await user.click(dateTrigger())
    await user.click(
      await screen.findByRole('button', { name: /20 de setembro de 2026/ }),
    )

    await waitFor(() => expect(dateTrigger()).toHaveTextContent('20/09/26'))
    expect(activeCount()).toBe('1')
  })

  it('keeps both ends of a range picked in the calendar', async () => {
    const { user } = renderButton()

    await openMenu(user)
    await user.click(dateTrigger())
    await user.click(
      await screen.findByRole('button', { name: /18 de setembro de 2026/ }),
    )
    await user.click(
      await screen.findByRole('button', { name: /20 de setembro de 2026/ }),
    )

    await waitFor(() =>
      expect(dateTrigger()).toHaveTextContent('18/09/26 – 20/09/26'),
    )
  })

  it('closes an open range on the day that is clicked next', async () => {
    const { user } = renderButton({ dateFrom: '2026-09-20' })

    await openMenu(user)
    await user.click(dateTrigger())
    await user.click(
      await screen.findByRole('button', { name: /22 de setembro de 2026/ }),
    )

    await waitFor(() =>
      expect(dateTrigger()).toHaveTextContent('20/09/26 – 22/09/26'),
    )
    expect(activeCount()).toBe('1')
  })

  it('clears the range when its only day is clicked again', async () => {
    const { user } = renderButton({
      dateFrom: '2026-09-20',
      dateTo: '2026-09-20',
    })

    await openMenu(user)
    expect(activeCount()).toBe('1')
    await user.click(dateTrigger())
    await user.click(
      await screen.findByRole('button', { name: /20 de setembro de 2026/ }),
    )

    await waitFor(() => expect(dateTrigger()).toHaveTextContent('Customizar'))
    expect(activeCount()).toBe('')
  })
})

describe('<ProjectFilterButton /> preset toggle', () => {
  it('drops the preset when the picked one is clicked again', async () => {
    const { user } = renderButton({ createdAt: 'today' })

    const menu = await openMenu(user)
    expect(activeCount()).toBe('1')
    await user.click(menu.getByRole('menuitemradio', { name: 'Hoje' }))

    await waitFor(() => expect(activeCount()).toBe(''))
  })
})
