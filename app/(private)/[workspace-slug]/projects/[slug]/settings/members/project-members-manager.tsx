'use client'

import { Search01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { SortingState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { SettingsPage } from '@/app/(private)/_components/settings-page'
import { NexoIcon } from '@/components/icon/icon'
import { DataTable } from '@/components/ui/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/ui/data-table/data-table-faceted-filter'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { notify } from '@/lib/notify'
import {
  useProjectMembers,
  useRemoveProjectMember,
} from '@/src/hooks/use-project-member'
import { AddProjectMemberDialog } from './add-project-member-dialog'
import { ProjectLeadSelect } from './project-lead-select'
import { getProjectMemberColumns } from './project-member-columns'

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

  const { mutateAsync: removeMemberAsync } = removeMember
  const handleRemove = useCallback(
    (userId: string) =>
      notify.run(removeMemberAsync(userId), {
        loading: 'Removendo membro...',
        success: 'Membro removido',
        error: 'Erro ao remover membro',
      }),
    [removeMemberAsync],
  )

  const columns = useMemo(
    () =>
      getProjectMemberColumns({
        canManage,
        onRemove: handleRemove,
        removePending: removeMember.isPending,
      }),
    [canManage, handleRemove, removeMember.isPending],
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

  return (
    <SettingsPage
      title='Membros'
      width='full'
      className='h-full flex-1 min-h-0 overflow-hidden'
    >
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

      <DataTable
        columns={columns}
        data={filteredMembers}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        loadingMessage='Carregando membros...'
        emptyMessage='Nenhum membro encontrado.'
      />
    </SettingsPage>
  )
}
