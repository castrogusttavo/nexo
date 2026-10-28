import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/src/__tests__/helpers/component'
import { DataTable } from '../data-table'

type Row = { name: string }

const COLUMNS: ColumnDef<Row>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <button type='button' onClick={() => column.toggleSorting()}>
        Nome
      </button>
    ),
  },
]

const ROWS: Row[] = [{ name: 'Carla' }, { name: 'Ana' }, { name: 'Bruno' }]

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('cell').textContent)
}

function ClientTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  return (
    <DataTable
      columns={COLUMNS}
      data={ROWS}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  )
}

describe('<DataTable />', () => {
  it('sorts the rows it was given when there is no server paging', async () => {
    const { user } = renderWithProviders(<ClientTable />)
    expect(names()).toEqual(['Carla', 'Ana', 'Bruno'])

    await user.click(screen.getByRole('button', { name: 'Nome' }))

    expect(names()).toEqual(['Ana', 'Bruno', 'Carla'])
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('keeps the server order and only reports the sorting when paged', async () => {
    const onSortingChange = vi.fn()
    const { user } = renderWithProviders(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        sorting={[]}
        onSortingChange={onSortingChange}
        pagination={{ page: 1, pageSize: 20, total: 3, onPageChange: vi.fn() }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Nome' }))

    expect(onSortingChange).toHaveBeenCalled()
    expect(names()).toEqual(['Carla', 'Ana', 'Bruno'])
  })

  it('shows skeleton rows and announces the load', () => {
    renderWithProviders(
      <DataTable
        columns={COLUMNS}
        data={[]}
        sorting={[]}
        onSortingChange={vi.fn()}
        isLoading
        loadingMessage='Carregando membros...'
      />,
    )

    expect(screen.getByText('Carregando membros...')).toHaveClass('sr-only')
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5)
  })

  it('says so when there is nothing to show', () => {
    renderWithProviders(
      <DataTable
        columns={COLUMNS}
        data={[]}
        sorting={[]}
        onSortingChange={vi.fn()}
        emptyMessage='Nenhum membro encontrado.'
      />,
    )

    expect(screen.getByText('Nenhum membro encontrado.')).toBeInTheDocument()
  })
})
