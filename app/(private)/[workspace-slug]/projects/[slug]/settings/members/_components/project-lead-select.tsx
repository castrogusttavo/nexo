'use client'

import { CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import { Combobox } from '@/components/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { notify } from '@/lib/notify'
import { NO_LEAD_NAME } from '@/lib/removed-user'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'
import type { ProjectMemberDTO } from '@/types/project'

interface ProjectLeadSelectProps {
  workspaceId: string
  projectSlug: string
  members: ProjectMemberDTO[]
  canManage: boolean
}

export function ProjectLeadSelect({
  workspaceId,
  projectSlug,
  members,
  canManage,
}: ProjectLeadSelectProps) {
  const { data: project } = useProject(workspaceId, projectSlug)
  const updateProject = useUpdateProject(workspaceId, projectSlug)

  const currentLead = members.find((m) => m.userId === project?.leadId)
  // A project whose lead was deleted has no lead at all — say so, rather than
  // prompting a viewer who may not be allowed to pick one.
  const emptyLeadLabel =
    project && !project.leadId ? NO_LEAD_NAME : 'Selecionar líder do projeto'

  function handleSelect(userId: string) {
    if (userId === project?.leadId) return
    notify.run(updateProject.mutateAsync({ leadId: userId }), {
      loading: 'Atualizando líder...',
      success: 'Líder do projeto atualizado',
      error: 'Erro ao atualizar líder',
    })
  }

  return (
    <div className='w-full flex items-center justify-between'>
      <div className='space-y-1'>
        <span className='text-sm font-medium'>Líder do projeto</span>
        <Muted className='text-xs'>Selecione o líder do projeto</Muted>
      </div>
      <Combobox
        options={members}
        getValue={(m) => m.userId}
        getSearchText={(m) => `${m.name} ${m.username}`}
        value={project?.leadId ?? undefined}
        onChange={handleSelect}
        searchPlaceholder='Procurar membro...'
        emptyMessage='Nenhum membro encontrado.'
        align='end'
        trigger={
          <Button
            variant='outline'
            size='sm'
            disabled={!canManage || updateProject.isPending}
            className='justify-start'
          >
            {currentLead ? (
              <span className='flex items-center gap-2'>
                <UserAvatar
                  size='sm'
                  name={currentLead.name}
                  image={currentLead.image}
                />
                @{currentLead.username}
              </span>
            ) : (
              emptyLeadLabel
            )}
          </Button>
        }
        renderItem={(member, selected) => (
          <>
            <UserAvatar size='sm' name={member.name} image={member.image} />
            <span className='flex-1'>@{member.username}</span>
            {selected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
          </>
        )}
      />
    </div>
  )
}
