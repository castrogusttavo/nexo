import { screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { EmojiIconPicker } from '../workspace-project-modal-emoji-icon-dialog'

// The emoji catalogue is a virtualised list that fetches its data set at
// runtime; stub it at the module boundary and drive the selection by hand,
// so these tests are about the picker's own search, colour and tabs.
vi.mock('frimousse', () => ({
  EmojiPicker: {
    SkinToneSelector: (props: ComponentProps<'button'>) => (
      <button type='button' {...props}>
        Tom de pele
      </button>
    ),
    Search: (props: ComponentProps<'input'>) => (
      <input data-testid='catalogue-search' {...props} />
    ),
  },
}))

vi.mock('@/components/ui/emoji-picker', () => ({
  EmojiPicker: ({
    children,
    onEmojiSelect,
  }: {
    children: ReactNode
    onEmojiSelect: (emoji: { emoji: string }) => void
  }) => (
    <div>
      {children}
      <button type='button' onClick={() => onEmojiSelect({ emoji: '🚀' })}>
        Foguete
      </button>
    </div>
  ),
  EmojiPickerContent: () => <div data-testid='emoji-grid' />,
}))

const GRAY = '#5c5e63'
const DARK_BLUE = '#266df0'

function renderPicker(currentEmoji?: string) {
  const onSelect = vi.fn()
  const utils = renderWithProviders(
    <EmojiIconPicker currentEmoji={currentEmoji} onSelect={onSelect} />,
  )
  return { ...utils, onSelect }
}

const trigger = () => screen.getAllByRole('button')[0]

async function openPicker(currentEmoji?: string) {
  const utils = renderPicker(currentEmoji)
  await utils.user.click(trigger())
  await screen.findByRole('menu')
  return utils
}

function panel() {
  const el = document.querySelector('[role="tabpanel"]')
  if (!(el instanceof HTMLElement)) throw new Error('No open tab panel')
  return el
}

/** Each lucide icon renders an aria-hidden svg inside its clickable cell. */
function iconCells() {
  return [...panel().querySelectorAll('svg[aria-hidden="true"]')].map(
    (svg) => svg.parentElement as HTMLElement,
  )
}

/** The colour swatches are the only elements with an inline background. */
function swatch(color: string) {
  const el = panel().querySelector(`[style*="${hexToRgb(color)}"]`)
  if (!(el instanceof HTMLElement)) throw new Error(`No ${color} swatch`)
  return el
}

function hexToRgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) =>
    Number.parseInt(hex.slice(i, i + 2), 16),
  )
  return `rgb(${r}, ${g}, ${b})`
}

const searchBox = () => within(panel()).getByPlaceholderText('Pesquisar')

describe('<EmojiIconPicker /> trigger', () => {
  it('offers a smiley while the project has no icon', () => {
    renderPicker()

    expect(trigger()).toHaveTextContent('😊')
  })

  it('shows the emoji the project already has', () => {
    renderPicker('🚀')

    expect(trigger()).toHaveTextContent('🚀')
  })
})

describe('<EmojiIconPicker /> icons tab', () => {
  it('opens on the icon catalogue', async () => {
    await openPicker()

    expect(screen.getByRole('tab', { name: 'Icon' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(iconCells().length).toBeGreaterThan(100)
  })

  it('narrows the catalogue to what was typed', async () => {
    const { user } = await openPicker()

    await user.type(searchBox(), 'airplay')

    await waitFor(() => expect(iconCells()).toHaveLength(1))
    expect(searchBox()).toHaveValue('airplay')
    // Typing must not fall through to the menu's own keyboard handling.
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('ignores the case of the search', async () => {
    const { user } = await openPicker()

    await user.type(searchBox(), 'AirPlay')

    await waitFor(() => expect(iconCells()).toHaveLength(1))
  })

  it('says when nothing matches', async () => {
    const { user } = await openPicker()

    await user.type(searchBox(), 'nao-existe')

    expect(
      await within(panel()).findByText('Nenhum ícone encontrado'),
    ).toBeInTheDocument()
    expect(iconCells()).toHaveLength(0)
  })

  it('brings the whole catalogue back when the search is cleared', async () => {
    const { user } = await openPicker()

    await user.type(searchBox(), 'airplay')
    await waitFor(() => expect(iconCells()).toHaveLength(1))
    await user.clear(searchBox())

    await waitFor(() => expect(iconCells().length).toBeGreaterThan(100))
    expect(
      within(panel()).queryByText('Nenhum ícone encontrado'),
    ).not.toBeInTheDocument()
  })

  it('reports the picked icon with the default colour', async () => {
    const { user, onSelect } = await openPicker()

    await user.type(searchBox(), 'airplay')
    await waitFor(() => expect(iconCells()).toHaveLength(1))
    await user.click(iconCells()[0])

    expect(onSelect).toHaveBeenCalledWith(`airplay:${GRAY}`)
  })

  it('repaints the catalogue in the picked colour', async () => {
    const { user } = await openPicker()

    await user.click(swatch(DARK_BLUE))

    await waitFor(() =>
      expect(iconCells()[0].querySelector('svg')).toHaveAttribute(
        'stroke',
        DARK_BLUE,
      ),
    )
  })

  it('reports the picked icon with the picked colour', async () => {
    const { user, onSelect } = await openPicker()

    await user.click(swatch(DARK_BLUE))
    await user.type(searchBox(), 'airplay')
    await waitFor(() => expect(iconCells()).toHaveLength(1))
    await user.click(iconCells()[0])

    expect(onSelect).toHaveBeenCalledWith(`airplay:${DARK_BLUE}`)
  })
})

describe('<EmojiIconPicker /> emoji tab', () => {
  async function openEmojiTab() {
    const utils = await openPicker()
    await utils.user.click(screen.getByRole('tab', { name: 'Emoji' }))
    await screen.findByTestId('emoji-grid')
    return utils
  }

  it('swaps the icon catalogue for the emoji one', async () => {
    await openEmojiTab()

    expect(screen.getByTestId('emoji-grid')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tom de pele' }),
    ).toBeInTheDocument()
  })

  it('feeds the visible search box into the catalogue search', async () => {
    const { user } = await openEmojiTab()

    await user.type(searchBox(), 'foguete')

    expect(searchBox()).toHaveValue('foguete')
    expect(screen.getByTestId('catalogue-search')).toHaveValue('foguete')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('reports the picked emoji', async () => {
    const { user, onSelect } = await openEmojiTab()

    await user.click(screen.getByRole('button', { name: 'Foguete' }))

    expect(onSelect).toHaveBeenCalledWith('🚀')
  })
})
