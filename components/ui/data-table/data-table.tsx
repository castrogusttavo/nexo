'use client'

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Muted } from '@/components/typography/text/muted'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from './data-table-pagination'

const SKELETON_ROWS = 5

interface DataTablePaging {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  /**
   * Server-side paging: the rows arrive sorted and paged, and the table only
   * reports the sorting. Without it the table sorts the rows it was given.
   */
  pagination?: DataTablePaging
  isLoading?: boolean
  /** Announced to screen readers while the skeleton rows show. */
  loadingMessage?: string
  emptyMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  onSortingChange,
  pagination,
  isLoading,
  loadingMessage = 'Carregando...',
  emptyMessage = 'Nenhum resultado encontrado.',
}: DataTableProps<TData, TValue>) {
  const serverSide = pagination !== undefined
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: serverSide,
    manualPagination: serverSide,
    ...(serverSide && {
      pageCount: Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
    }),
    getCoreRowModel: getCoreRowModel(),
    ...(!serverSide && { getSortedRowModel: getSortedRowModel() }),
  })

  return (
    <div className='flex-1 min-h-0 flex flex-col gap-3'>
      <div className='flex-1 min-h-0 overflow-y-auto rounded-md border'>
        <Table aria-busy={isLoading || undefined}>
          <TableHeader className='sticky top-0 z-10 bg-app'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      {rowIndex === 0 && colIndex === 0 && (
                        <span className='sr-only'>{loadingMessage}</span>
                      )}
                      <Skeleton className='h-4 w-full max-w-32' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  <Muted>{emptyMessage}</Muted>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && <DataTablePagination {...pagination} />}
    </div>
  )
}
