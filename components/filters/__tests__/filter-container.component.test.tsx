import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { FilterContainer } from '../filter-container'
import type { BasicFilterClause } from '../filter-schema'

const WORKSPACE_ID = 'ws-1'
const PROJECT_SLUG = 'nexo'

const TITLE_CLAUSE: BasicFilterClause = {
  id: 'clause-1',
  field: 'title',
  operator: 'is',
  value: 'Roadmap',
}

const MENTIONS_CLAUSE: BasicFilterClause = {
  id: 'clause-2',
  field: 'mentions',
  operator: 'is',
  value: ['user-1'],
}

/** The basic rows mount every option hook; answer them all with nothing. */
function mockOptionRoutes() {
  return mockFetch().mockImplementation(async (input) =>
    String(input).includes('/issues')
      ? apiSuccess({ items: [], nextCursor: null })
      : apiSuccess([]),
  )
}

function renderContainer(searchParams?: Record<string, string>) {
  const onClose = vi.fn()
  const utils = renderWithProviders(
    <FilterContainer
      workspaceId={WORKSPACE_ID}
      projectSlug={PROJECT_SLUG}
      onClose={onClose}
    />,
    { searchParams },
  )
  return { ...utils, onClose }
}

const pqlInput = () => screen.queryByRole('textbox', { name: 'Consulta PQL' })

beforeEach(() => {
  mockOptionRoutes()
})

describe('<FilterContainer /> modes', () => {
  it('opens on the basic builder', () => {
    renderContainer()

    expect(
      screen.getByRole('button', { name: 'Adicionar filtro' }),
    ).toBeInTheDocument()
    expect(pqlInput()).not.toBeInTheDocument()
  })

  it('swaps the basic builder for the PQL editor', async () => {
    const { user } = renderContainer()

    await user.click(screen.getByRole('button', { name: 'PQL' }))

    expect(pqlInput()).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Adicionar filtro' }),
    ).not.toBeInTheDocument()
  })

  it('goes back to the basic builder from PQL', async () => {
    const { user } = renderContainer({ mode: 'pql' })

    expect(pqlInput()).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Básico' }))

    expect(pqlInput()).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Adicionar filtro' }),
    ).toBeInTheDocument()
  })

  it('restores the clauses saved in the url', () => {
    renderContainer({ filters: JSON.stringify([TITLE_CLAUSE]) })

    expect(screen.getByRole('button', { name: 'Título' })).toBeInTheDocument()
  })
})

describe('<FilterContainer /> unsupported clauses', () => {
  it('stays silent while every clause can be evaluated', () => {
    renderContainer({ filters: JSON.stringify([TITLE_CLAUSE]) })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('names the basic clauses it had to ignore', () => {
    renderContainer({ filters: JSON.stringify([MENTIONS_CLAUSE]) })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Estes filtros ainda não são suportados e foram ignorados: Menções.',
    )
  })

  it('names the unsupported functions of a PQL query', () => {
    renderContainer({ mode: 'pql', pql: 'hasComments()' })

    expect(screen.getByRole('status')).toHaveTextContent('hasComments().')
  })
})

describe('<FilterContainer /> actions', () => {
  it('clears both the clauses and the PQL query', async () => {
    const { user } = renderContainer({
      filters: JSON.stringify([TITLE_CLAUSE]),
    })

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Título' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', { name: 'Adicionar filtro' }),
    ).toBeInTheDocument()
  })

  it('keeps the current mode when the filters are cleared', async () => {
    const { user } = renderContainer({ mode: 'pql', pql: 'hasComments()' })

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(pqlInput()).toHaveValue(''))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('closes the panel', async () => {
    const { user, onClose } = renderContainer()

    await user.click(screen.getByRole('button', { name: 'Fechar filtros' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
