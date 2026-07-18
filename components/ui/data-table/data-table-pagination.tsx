'use client'

import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

interface DataTablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: DataTablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className='flex items-center justify-between'>
      <Muted>
        {total === 0
          ? 'Nenhum membro'
          : `Página ${page} de ${pageCount} · ${total} membro${total === 1 ? '' : 's'}`}
      </Muted>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button
          variant='outline'
          size='sm'
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
