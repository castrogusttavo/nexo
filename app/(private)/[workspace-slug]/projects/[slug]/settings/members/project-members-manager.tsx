'use client'

import { Search01Icon } from '@hugeicons-pro/core-stroke-rounded'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { DataTableFacetedFilter } from '@/components/ui/data-table/data-table-faceted-filter'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { notify } from '@/lib/notify'
import {
  useProjectMembers,
  useRemoveProjectMember,
} from '@/src/hooks/use-project-member'
import { AddProjectMemberDialog } from './add-project-member-dialog'
import { getProjectMemberColumns } from './columns'
import { ProjectLeadSelect } from './project-lead-select'

const ROLE_OPTIONS = [
  { value: 'LEAD', label: 'Líder' },
  { value: 'MEMBER', label: 'Membro' },
]

interface ProjectMembersManagerProps {
  workspaceId: string
  projectSlug: string
  canManage: boolean
}

export function ProjectMembersManager({
  workspaceId,
  projectSlug,
  canManage,
}: ProjectMembersManagerProps) {
  const { data: members, isLoading } = useProjectMembers(
    workspaceId,
    projectSlug,
  )
  const removeMember = useRemoveProjectMember(workspaceId, projectSlug)

  const [search, setSearch] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [sorting, setSorting] = useState<SortingState>([])

  function handleRemove(userId: string) {
    notify.mutate(removeMember.mutateAsync(userId), {
      loading: 'Removendo membro...',
      success: 'Membro removido',
      error: 'Erro ao remover membro',
    })
  }

  const columns = useMemo(
    () =>
      getProjectMemberColumns({
        canManage,
        onRemove: handleRemove,
        removePending: removeMember.isPending,
      }),
    [canManage, removeMember.isPending],
  )

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (members ?? []).filter((member) => {
      const matchesSearch =
        !term ||
        member.name.toLowerCase().includes(term) ||
        member.username.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term)
      const matchesRole =
        roles.length === 0 || roles.includes(member.isLead ? 'LEAD' : 'MEMBER')
      return matchesSearch && matchesRole
    })
  }, [members, search, roles])

  const table = useReactTable({
    data: filteredMembers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className='w-full h-full p-6 flex-1 min-h-0 flex flex-col gap-6 overflow-hidden'>
      <div className='flex items-center justify-between'>
        <H3>Membros</H3>
      </div>

      <ProjectLeadSelect
        workspaceId={workspaceId}
        projectSlug={projectSlug}
        members={members ?? []}
        canManage={canManage}
      />

      <div className='w-full flex items-end justify-between gap-2'>
        <span>Pessoas</span>
        <div className='flex items-center gap-2'>
          <InputGroup className='flex items-center gap-.15 rounded-md px-2.5! py-1.5! max-w-3xs max-h-8'>
            <InputGroupInput
              placeholder='Pesquisa...'
              className='p-0'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <InputGroupAddon className='p-0'>
              <NexoIcon icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupAddon align='inline-end' className='p-0'>
              {filteredMembers.length} resultado
              {filteredMembers.length === 1 ? '' : 's'}
            </InputGroupAddon>
          </InputGroup>
          <DataTableFacetedFilter
            title='Papel'
            options={ROLE_OPTIONS}
            selected={roles}
            onChange={setRoles}
          />
          {canManage && (
            <AddProjectMemberDialog
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              currentMemberIds={members?.map((m) => m.userId) ?? []}
            />
          )}
        </div>
      </div>

      <div className='rounded-md border w-full h-full'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className='h-4 w-full max-w-32' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Muted className='py-4 text-center block'>
                    Nenhum membro encontrado.
                  </Muted>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
