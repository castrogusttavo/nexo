'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header'
import type { MemberDTO } from '@/types/member'

const ROLE_LABEL: Record<MemberDTO['role'], string> = {
  OWNER: 'Dono',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  VIEWER: 'Visualizador',
}

const STATUS_LABEL: Record<MemberDTO['accountStatus'], string> = {
  ACTIVE: 'Ativo',
  UNVERIFIED: 'Não verificado',
  PENDING_DELETION: 'Exclusão agendada',
}

const STATUS_VARIANT: Record<
  MemberDTO['accountStatus'],
  'secondary' | 'default' | 'destructive'
> = {
  ACTIVE: 'secondary',
  UNVERIFIED: 'default',
  PENDING_DELETION: 'destructive',
}

const AUTH_METHOD_LABEL: Record<string, string> = {
  EMAIL_PASSWORD: 'E-mail e senha',
  GOOGLE: 'Google',
  GITHUB: 'GitHub',
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export const memberColumns: ColumnDef<MemberDTO>[] = [
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
        <Avatar size='sm'>
          <AvatarImage src={row.original.image || ''} alt={row.original.name} />
          <AvatarFallback>
            {row.original.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
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
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title='Cargo'
        ascLabel='Visualizador-Dono'
        descLabel='Dono-Visualizador'
      />
    ),
    cell: ({ row }) => ROLE_LABEL[row.original.role],
  },
  {
    accessorKey: 'accountStatus',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.accountStatus]}>
        {STATUS_LABEL[row.original.accountStatus]}
      </Badge>
    ),
  },
  {
    accessorKey: 'authMethods',
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Autenticação' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-wrap gap-1'>
        {row.original.authMethods.map((method) => (
          <Badge key={method} variant='outline'>
            {AUTH_METHOD_LABEL[method] ?? method}
          </Badge>
        ))}
        {row.original.twoFactorEnabled && <Badge variant='outline'>2FA</Badge>}
      </div>
    ),
  },
  {
    accessorKey: 'joinedAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title='Data de entrada'
        ascLabel='Mais antigo'
        descLabel='Mais recente'
      />
    ),
    cell: ({ row }) => dateFmt.format(new Date(row.original.joinedAt)),
  },
]
