'use client'

import type { SortingState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { WorkspaceSettingsMemberHeader } from '@/app/_components/workspace/settings/members/workspace-settings-memeber-header'
import { DataTable } from '@/components/ui/data-table/data-table'
import { useMembers } from '@/src/hooks/use-member'
import { memberColumns } from './columns'
import { PendingInvitationsList } from './pending-invitations-list'

const PAGE_SIZE = 20

export function MembersManager({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'joinedAt', desc: true },
  ])
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roles, sorting])

  const sort = sorting[0]

  const { data, isLoading } = useMembers(workspaceId, {
    search: debouncedSearch || undefined,
    roles: roles.length ? roles : undefined,
    sortBy: sort?.id ?? 'joinedAt',
    sortOrder: sort?.desc ? 'desc' : 'asc',
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className='flex-1 min-h-0 flex flex-col gap-4'>
      <WorkspaceSettingsMemberHeader
        workspaceId={workspaceId}
        search={search}
        onSearchChange={setSearch}
        roles={roles}
        onRolesChange={setRoles}
        resultCount={data?.total ?? 0}
      />
      <DataTable
        columns={memberColumns}
        data={data?.members ?? []}
        sorting={sorting}
        onSortingChange={setSorting}
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage='Nenhum membro encontrado.'
      />
      <PendingInvitationsList workspaceId={workspaceId} />
    </div>
  )
}
