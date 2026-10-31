'use client'

import { CheckIcon } from '@hugeicons-pro/core-solid-rounded'
import { UsersRoundIcon } from '@hugeicons-pro/core-stroke-rounded'
import { Combobox } from '@/components/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { notify } from '@/lib/notify'
import { useMembers } from '@/src/hooks/use-member'
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
} from '@/src/hooks/use-project-member'
import { ProjectDetailsFieldRow } from './project-details-field-row'
import type { ProjectDetailsFieldProps } from './project-details-types'

const MAX_VISIBLE = 3

// The options are the workspace's members (up to the API's page of 100: a
// bigger workspace needs a server-side search) and the value is who is on the
// project. A project has no "set the members" call, so a change becomes one add
// or remove per person.
export function ProjectDetailsMembersField({
  workspaceId,
  project,
  canManage,
}: ProjectDetailsFieldProps) {
  const { data: projectMembers = [] } = useProjectMembers(
    workspaceId,
    project.slug,
  )
  const { data: workspaceMembers } = useMembers(workspaceId, {
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  })
  const add = useAddProjectMember(workspaceId, project.slug)
  const remove = useRemoveProjectMember(workspaceId, project.slug)

  const value = projectMembers.map((m) => m.userId)

  function handleChange(next: string[]) {
    const before = new Set(value)
    const after = new Set(next)
    // The API refuses to remove the lead, so the lead never leaves from here.
    const toAdd = next.filter((id) => !before.has(id))
    const toRemove = value.filter(
      (id) => !after.has(id) && id !== project.leadId,
    )

    const calls = [
      ...toAdd.map((id) => add.mutateAsync(id)),
      ...toRemove.map((id) => remove.mutateAsync(id)),
    ]
    if (calls.length === 0) return

    notify.run(Promise.all(calls), {
      loading: 'Atualizando membros...',
      success: 'Membros atualizados',
      error: 'Não foi possível atualizar os membros',
    })
  }

  return (
    <ProjectDetailsFieldRow icon={UsersRoundIcon} label='Membros'>
      <Combobox
        multiple
        options={workspaceMembers?.members ?? []}
        getValue={(m) => m.userId}
        getSearchText={(m) => `${m.name} ${m.username}`}
        value={value}
        onChange={handleChange}
        searchPlaceholder='Procurar membro...'
        emptyMessage='Nenhum membro encontrado.'
        trigger={
          <Button
            variant='ghost'
            size='sm'
            // The avatars name no one for a screen reader.
            aria-label='Membros do projeto'
            disabled={!canManage || add.isPending || remove.isPending}
            className='w-3/5 justify-start'
          >
            {projectMembers.length === 0 ? (
              'Adicionar membros'
            ) : (
              <AvatarGroup>
                {projectMembers.slice(0, MAX_VISIBLE).map((m) => (
                  <UserAvatar
                    key={m.userId}
                    size='sm'
                    name={m.name}
                    image={m.image}
                  />
                ))}
                {projectMembers.length > MAX_VISIBLE && (
                  <AvatarGroupCount>
                    +{projectMembers.length - MAX_VISIBLE}
                  </AvatarGroupCount>
                )}
              </AvatarGroup>
            )}
          </Button>
        }
        renderItem={(m, selected) => (
          <div className='w-full flex items-center justify-between'>
            <span className='flex items-center gap-1.5'>
              <UserAvatar size='sm' name={m.name} image={m.image} />
              {m.name}
            </span>
            {selected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
          </div>
        )}
      />
    </ProjectDetailsFieldRow>
  )
}
