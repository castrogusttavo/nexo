import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { FilterAdvanced } from '../filter-advanced'
import type { BasicFilterClause } from '../filter-schema'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

const TITLE_CLAUSE: BasicFilterClause = {
  id: 'clause-1',
  field: 'title',
  operator: 'is',
  value: 'Roadmap',
}

const DESCRIPTION_CLAUSE: BasicFilterClause = {
  id: 'clause-2',
  field: 'description',
  operator: 'contains',
  value: 'api',
}

/** The rows mount every option hook at once; answer them all with nothing. */
function mockOptionRoutes() {
  return mockFetch().mockImplementation(async (input) =>
    String(input).includes('/issues')
      ? apiSuccess({ items: [], nextCursor: null })
      : apiSuccess([]),
  )
}

function renderAdvanced(clauses: BasicFilterClause[]) {
  const onClausesChange = vi.fn()
  const utils = renderWithProviders(
    <FilterAdvanced
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      clauses={clauses}
      onClausesChange={onClausesChange}
    />,
  )
  return { ...utils, onClausesChange }
}

async function addField(
  user: ReturnType<typeof renderAdvanced>['user'],
  name: string,
) {
  await user.click(screen.getByRole('button', { name: 'Adicionar filtro' }))
  const list = within(await screen.findByRole('listbox'))
  await user.click(list.getByRole('option', { name }))
}

beforeEach(() => {
  mockOptionRoutes()
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(
    '00000000-0000-4000-8000-000000000000',
  )
})

describe('<FilterAdvanced />', () => {
  it('offers only the "add filter" select while there is no clause', () => {
    renderAdvanced([])

    expect(
      screen.getByRole('button', { name: 'Adicionar filtro' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remover filtro' }),
    ).not.toBeInTheDocument()
  })

  it('renders one row per clause', () => {
    renderAdvanced([TITLE_CLAUSE, DESCRIPTION_CLAUSE])

    expect(screen.getByRole('button', { name: 'Título' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Descrição' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Remover filtro' })).toHaveLength(
      2,
    )
  })

  it('appends a new clause with the field default operator and no value', async () => {
    const { user, onClausesChange } = renderAdvanced([TITLE_CLAUSE])

    await addField(user, 'Prioridade')

    expect(onClausesChange).toHaveBeenCalledWith([
      TITLE_CLAUSE,
      {
        id: '00000000-0000-4000-8000-000000000000',
        field: 'priority',
        operator: 'is',
        value: null,
      },
    ])
  })

  it('replaces only the edited row', async () => {
    const { user, onClausesChange } = renderAdvanced([
      TITLE_CLAUSE,
      DESCRIPTION_CLAUSE,
    ])

    await user.click(screen.getByRole('button', { name: 'contém' }))
    const list = within(await screen.findByRole('listbox'))
    await user.click(list.getByRole('option', { name: 'não contém' }))

    expect(onClausesChange).toHaveBeenCalledWith([
      TITLE_CLAUSE,
      { ...DESCRIPTION_CLAUSE, operator: 'not-contains', value: null },
    ])
  })

  it('drops only the removed row', async () => {
    const { user, onClausesChange } = renderAdvanced([
      TITLE_CLAUSE,
      DESCRIPTION_CLAUSE,
    ])

    await user.click(
      screen.getAllByRole('button', { name: 'Remover filtro' })[0],
    )

    expect(onClausesChange).toHaveBeenCalledWith([DESCRIPTION_CLAUSE])
  })
})
