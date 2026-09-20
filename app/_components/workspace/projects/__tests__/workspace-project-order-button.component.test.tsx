import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { ProjectorderButton } from '../workspace-project-order-button'

function renderButton(searchParams?: Record<string, string>) {
  return renderWithProviders(<ProjectorderButton />, { searchParams })
}

const trigger = () => screen.getByRole('button')

async function openMenu(user: ReturnType<typeof renderButton>['user']) {
  await user.click(trigger())
  return within(await screen.findByRole('menu'))
}

type MenuQueries = Awaited<ReturnType<typeof openMenu>>

const checked = (menu: MenuQueries) =>
  menu
    .getAllByRole('menuitemradio')
    .filter((item) => item.getAttribute('aria-checked') === 'true')
    .map((item) => item.textContent)

describe('<ProjectorderButton />', () => {
  it('labels the trigger with the default sort field', () => {
    renderButton()

    expect(trigger()).toHaveTextContent('Data de criação')
  })

  it('labels the trigger with the sort field from the url', () => {
    renderButton({ sortField: 'name' })

    expect(trigger()).toHaveTextContent('Nome')
  })

  it('marks the sort field and direction currently in effect', async () => {
    const { user } = renderButton({ sortField: 'name', sortOrder: 'asc' })

    const menu = await openMenu(user)

    expect(checked(menu)).toEqual(['Nome', 'Crescente'])
  })

  it('defaults to the newest first', async () => {
    const { user } = renderButton()

    const menu = await openMenu(user)

    expect(checked(menu)).toEqual(['Data de criação', 'Decrescente'])
  })

  it('switches the sort field', async () => {
    const { user } = renderButton()

    const menu = await openMenu(user)
    await user.click(menu.getByRole('menuitemradio', { name: 'Nome' }))

    await waitFor(() => expect(trigger()).toHaveTextContent('Nome'))
  })

  it('switches the direction without touching the field', async () => {
    const { user } = renderButton({ sortField: 'name' })

    const menu = await openMenu(user)
    await user.click(menu.getByRole('menuitemradio', { name: 'Crescente' }))

    await waitFor(() => expect(checked(menu)).toEqual(['Nome', 'Crescente']))
    expect(trigger()).toHaveTextContent('Nome')
  })
})
