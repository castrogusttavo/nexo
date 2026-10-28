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
  const [groupBy, sortBy] = within(menu).getAllByRole('radiogroup')
  return { ...result, menu, groupBy, sortBy }
}

// The labels sit next to their control in a field but are not tied to it, so
// the control has no accessible name: it is reached through its field.
function controlFor(container: HTMLElement, label: string, role: string) {
  const field = within(container)
    .getByText(label)
    .closest<HTMLElement>('[data-slot="field"]')
  if (!field) throw new Error(`No field for "${label}"`)
  return within(field).getByRole(role)
}

describe('<IssueShowPropertiesDropdown />', () => {
  it('groups the list by the picked property', async () => {
    const { user, groupBy } = await openDropdown()
    const option = controlFor(groupBy, 'Ciclo', 'radio')
    expect(option).not.toBeChecked()

    await user.click(option)

    expect(option).toBeChecked()
    expect(controlFor(groupBy, 'Estados', 'radio')).not.toBeChecked()
  })

  it('sorts the list by the picked property', async () => {
    const { user, sortBy } = await openDropdown()
    const option = controlFor(sortBy, 'Data de vencimento', 'radio')

    await user.click(option)

    expect(option).toBeChecked()
    expect(
      controlFor(sortBy, 'Manual - classificação', 'radio'),
    ).not.toBeChecked()
  })

  it('turns sub-issues and empty groups off and back on', async () => {
    const { user, menu } = await openDropdown()
    const subIssues = controlFor(menu, 'Mostrar sub-issues', 'checkbox')
    const emptyGroups = controlFor(menu, 'Mostrar grupos vazios', 'checkbox')
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
    await first.user.click(controlFor(first.groupBy, 'Módulo', 'radio'))
    first.unmount()

    const { groupBy } = await openDropdown()

    expect(controlFor(groupBy, 'Módulo', 'radio')).toBeChecked()
  })
})
