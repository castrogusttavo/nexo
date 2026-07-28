'use client'

import { CheckIcon } from '@hugeicons-pro/core-stroke-rounded'
import { Combobox } from '@/app/_components/ui/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { getInitials } from '@/lib/user-name-initials'
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

  function handleSelect(userId: string) {
    if (userId === project?.leadId) return
    notify.mutate(updateProject.mutateAsync({ leadId: userId }), {
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
        value={project?.leadId}
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
                <Avatar size='sm'>
                  <AvatarImage
                    src={currentLead.image || ''}
                    alt={currentLead.name}
                  />
                  <AvatarFallback>
                    {getInitials(currentLead.name)}
                  </AvatarFallback>
                </Avatar>
                @{currentLead.username}
              </span>
            ) : (
              'Selecionar líder do projeto'
            )}
          </Button>
        }
        renderItem={(member, selected) => (
          <>
            <Avatar size='sm'>
              <AvatarImage src={member.image || ''} alt={member.name} />
              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <span className='flex-1'>@{member.username}</span>
            {selected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
          </>
        )}
      />
    </div>
  )
}
