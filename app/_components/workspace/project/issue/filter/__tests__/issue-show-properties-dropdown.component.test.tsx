import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { IssueShowPropertiesDropdown } from '../issue-show-properties-dropdown'

// The preferences live in a module-level store shared by every test here,
// so each test asserts on the option it changes, not on the whole state.
async function openDropdown() {
  const result = renderWithProviders(<IssueShowPropertiesDropdown />)
  await result.user.click(screen.getByRole('button', { name: 'Exibir' }))
  const menu = await screen.findByRole('menu')
  const groupBy = within(menu).getByRole('radiogroup', { name: 'Agrupado por' })
  const sortBy = within(menu).getByRole('radiogroup', { name: 'Ordenar por' })
  return { ...result, menu, groupBy, sortBy }
}

describe('<IssueShowPropertiesDropdown />', () => {
  it('names every control after its label, the way a screen reader reads it', async () => {
    const { menu, groupBy, sortBy } = await openDropdown()

    expect(within(groupBy).getAllByRole('radio')).toHaveLength(8)
    for (const name of [
      'Estados',
      'Prioridade',
      'Ciclo',
      'Módulo',
      'Etiquetas',
      'Responsáveis',
      'Criado por',
      'Nenhum',
    ]) {
      expect(within(groupBy).getByRole('radio', { name })).toBeInTheDocument()
    }
    for (const name of [
      'Manual - classificação',
      'Criado em',
      'Atualizado em',
      'Data de início',
      'Data de vencimento',
      'Prioridade',
    ]) {
      expect(within(sortBy).getByRole('radio', { name })).toBeInTheDocument()
    }
    expect(
      within(menu).getByRole('checkbox', { name: 'Mostrar sub-issues' }),
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('checkbox', { name: 'Mostrar grupos vazios' }),
    ).toBeInTheDocument()
  })

  it('picks an option by clicking its label', async () => {
    const { user, groupBy } = await openDropdown()

    await user.click(within(groupBy).getByText('Etiquetas'))

    expect(
      within(groupBy).getByRole('radio', { name: 'Etiquetas' }),
    ).toBeChecked()
  })

  it('groups the list by the picked property', async () => {
    const { user, groupBy } = await openDropdown()
    const option = within(groupBy).getByRole('radio', { name: 'Ciclo' })
    expect(option).not.toBeChecked()

    await user.click(option)

    expect(option).toBeChecked()
    expect(
      within(groupBy).getByRole('radio', { name: 'Estados' }),
    ).not.toBeChecked()
  })

  it('sorts the list by the picked property', async () => {
    const { user, sortBy } = await openDropdown()
    const option = within(sortBy).getByRole('radio', {
      name: 'Data de vencimento',
    })

    await user.click(option)

    expect(option).toBeChecked()
    expect(
      within(sortBy).getByRole('radio', { name: 'Manual - classificação' }),
    ).not.toBeChecked()
  })

  it('turns sub-issues and empty groups off and back on', async () => {
    const { user, menu } = await openDropdown()
    const subIssues = within(menu).getByRole('checkbox', {
      name: 'Mostrar sub-issues',
    })
    const emptyGroups = within(menu).getByRole('checkbox', {
      name: 'Mostrar grupos vazios',
    })
    expect(subIssues).toBeChecked()
    expect(emptyGroups).toBeChecked()

    await user.click(subIssues)
    await user.click(emptyGroups)
    expect(subIssues).not.toBeChecked()
    expect(emptyGroups).not.toBeChecked()

    await user.click(subIssues)
    expect(subIssues).toBeChecked()
  })

  it('opens again with the choices made before', async () => {
    const first = await openDropdown()
    await first.user.click(
      within(first.groupBy).getByRole('radio', { name: 'Módulo' }),
    )
    first.unmount()

    const { groupBy } = await openDropdown()

    expect(within(groupBy).getByRole('radio', { name: 'Módulo' })).toBeChecked()
  })
})
