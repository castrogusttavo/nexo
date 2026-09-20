import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import type { BasicOperator, FilterField } from '../filter-schema'
import { FilterOperatorSelect } from '../filter-operator-select'

function renderSelect(field: FilterField, value?: BasicOperator) {
  const onChange = vi.fn()
  const utils = renderWithProviders(
    <FilterOperatorSelect field={field} value={value} onChange={onChange} />,
  )
  return { ...utils, onChange }
}

/** Opens the combobox and returns queries scoped to its option list. */
async function openOptions(user: ReturnType<typeof renderSelect>['user']) {
  await user.click(screen.getByRole('button'))
  return within(await screen.findByRole('listbox'))
}

type OptionQueries = Awaited<ReturnType<typeof openOptions>>

const optionNames = (list: OptionQueries) =>
  list.getAllByRole('option').map((option) => option.textContent)

describe('<FilterOperatorSelect />', () => {
  it('labels the trigger with the pt-BR name of the current operator', () => {
    renderSelect('title', 'is-not')

    expect(screen.getByRole('button', { name: 'não é' })).toBeInTheDocument()
  })

  it('falls back to the field title when no operator is picked yet', () => {
    renderSelect('title', undefined)

    expect(screen.getByRole('button', { name: 'Operador' })).toBeInTheDocument()
  })

  it('offers only the operators a text field supports', async () => {
    const { user } = renderSelect('title')

    const list = await openOptions(user)

    expect(optionNames(list)).toEqual(['é', 'não é', 'contém', 'não contém'])
  })

  it('offers "está vazio" only for a field that can be empty', async () => {
    const { user } = renderSelect('description')

    const list = await openOptions(user)

    expect(optionNames(list)).toContain('está vazio')
  })

  it('offers the range operators for a date field', async () => {
    const { user } = renderSelect('due-date')

    const list = await openOptions(user)

    expect(optionNames(list)).toEqual(
      expect.arrayContaining(['antes de', 'depois ou em', 'entre', 'não entre']),
    )
  })

  it('narrows an enum field down to identity operators', async () => {
    const { user } = renderSelect('state')

    const list = await openOptions(user)

    expect(optionNames(list)).toEqual(['é', 'não é'])
  })

  it('reports the picked operator by its code, not its label', async () => {
    const { user, onChange } = renderSelect('description', 'is')

    const list = await openOptions(user)
    await user.click(list.getByRole('option', { name: 'não contém' }))

    expect(onChange).toHaveBeenCalledWith('not-contains')
  })
})
