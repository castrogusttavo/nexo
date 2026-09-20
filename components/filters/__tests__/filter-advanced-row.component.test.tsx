import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { FilterAdvancedRow } from '../filter-advanced-row'
import type { BasicFilterClause } from '../filter-schema'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

const STATES = [
  { id: 'state-todo', name: 'A fazer' },
  { id: 'state-doing', name: 'Em andamento' },
]

/**
 * The value input mounts every option hook at once (states, types, labels,
 * cycles, modules, members, issues), so the fetch mock answers by route.
 */
function mockOptionRoutes() {
  return mockFetch().mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/states')) return apiSuccess(STATES)
    if (url.includes('/issues'))
      return apiSuccess({ items: [], nextCursor: null })
    return apiSuccess([])
  })
}

function buildClause(
  overrides: Partial<BasicFilterClause> = {},
): BasicFilterClause {
  return {
    id: 'clause-1',
    field: 'title',
    operator: 'is',
    value: 'Roadmap',
    ...overrides,
  }
}

function renderRow(clause: BasicFilterClause) {
  const onChange = vi.fn()
  const onRemove = vi.fn()
  const utils = renderWithProviders(
    <FilterAdvancedRow
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      clause={clause}
      onChange={onChange}
      onRemove={onRemove}
    />,
  )
  return { ...utils, onChange, onRemove }
}

/** Opens the combobox behind `triggerName` and scopes queries to its list. */
async function openSelect(
  user: ReturnType<typeof renderRow>['user'],
  triggerName: string,
) {
  await user.click(screen.getByRole('button', { name: triggerName }))
  return within(await screen.findByRole('listbox'))
}

beforeEach(() => {
  mockOptionRoutes()
})

describe('<FilterAdvancedRow />', () => {
  it('shows the clause as field, operator and value', () => {
    renderRow(buildClause())

    expect(screen.getByRole('button', { name: 'Título' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'é' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Valor')).toHaveValue('Roadmap')
  })

  it('resets the operator and the value when the field changes', async () => {
    const { user, onChange } = renderRow(
      buildClause({ field: 'title', operator: 'contains', value: 'Roadmap' }),
    )

    const list = await openSelect(user, 'Título')
    await user.click(list.getByRole('option', { name: 'Data de Vencimento' }))

    // `operatorsFor('due-date')[0]` is `is`, and the old text value cannot
    // describe a date, so it is dropped.
    expect(onChange).toHaveBeenCalledWith({
      id: 'clause-1',
      field: 'due-date',
      operator: 'is',
      value: null,
    })
  })

  it('clears the value when only the operator changes', async () => {
    const { user, onChange } = renderRow(buildClause({ value: 'Roadmap' }))

    const list = await openSelect(user, 'é')
    await user.click(list.getByRole('option', { name: 'contém' }))

    expect(onChange).toHaveBeenCalledWith({
      id: 'clause-1',
      field: 'title',
      operator: 'contains',
      value: null,
    })
  })

  it('keeps the field and operator while the value is edited', async () => {
    const { user, onChange } = renderRow(buildClause({ value: '' }))

    await user.type(screen.getByPlaceholderText('Valor'), 'R')

    expect(onChange).toHaveBeenCalledWith({
      id: 'clause-1',
      field: 'title',
      operator: 'is',
      value: 'R',
    })
  })

  it('drops the value input for an operator that takes no value', () => {
    renderRow(buildClause({ field: 'description', operator: 'is-empty' }))

    expect(screen.queryByPlaceholderText('Valor')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'está vazio' }),
    ).toBeInTheDocument()
  })

  it('feeds the value select with the project options for the field', async () => {
    const { user, onChange } = renderRow(
      buildClause({ field: 'state', operator: 'is', value: [] }),
    )

    const list = await openSelect(user, 'Selecionar')
    expect(
      list.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['A fazer', 'Em andamento'])

    await user.click(list.getByRole('option', { name: 'Em andamento' }))

    expect(onChange).toHaveBeenCalledWith({
      id: 'clause-1',
      field: 'state',
      operator: 'is',
      value: ['state-doing'],
    })
  })

  it('removes the row', async () => {
    const { user, onRemove } = renderRow(buildClause())

    await user.click(screen.getByRole('button', { name: 'Remover filtro' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
