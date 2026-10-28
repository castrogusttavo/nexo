'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header'
import { UserAvatar } from '@/components/user-avatar'
import type { ProjectMemberDTO } from '@/types/project'

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

interface ProjectMemberColumnsOptions {
  canManage: boolean
  onRemove: (userId: string) => void
  removePending: boolean
}

export function getProjectMemberColumns({
  canManage,
  onRemove,
  removePending,
}: ProjectMemberColumnsOptions): ColumnDef<ProjectMemberDTO>[] {
  const columns: ColumnDef<ProjectMemberDTO>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='Nome completo'
          ascLabel='A-Z'
          descLabel='Z-A'
        />
      ),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <UserAvatar
            size='sm'
            name={row.original.name}
            image={row.original.image}
          />
          <span className='font-medium'>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='Username'
          ascLabel='A-Z'
          descLabel='Z-A'
        />
      ),
      cell: ({ row }) => (
        <span className='text-primary'>@{row.original.username}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='E-mail'
          ascLabel='A-Z'
          descLabel='Z-A'
        />
      ),
    },
    {
      accessorKey: 'isLead',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='Papel'
          ascLabel='Membro-Líder'
          descLabel='Líder-Membro'
        />
      ),
      cell: ({ row }) =>
        row.original.isLead ? (
          <Badge variant='secondary'>Líder</Badge>
        ) : (
          'Membro'
        ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title='Data de entrada'
          ascLabel='Mais antigo'
          descLabel='Mais recente'
        />
      ),
      cell: ({ row }) => dateFmt.format(new Date(row.original.createdAt)),
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      enableSorting: false,
      header: () => null,
      cell: ({ row }) =>
        !row.original.isLead && (
          <Button
            variant='ghost'
            size='sm'
            className='h-7'
            disabled={removePending}
            onClick={() => onRemove(row.original.userId)}
          >
            Excluir
          </Button>
        ),
    })
  }

  return columns
}
