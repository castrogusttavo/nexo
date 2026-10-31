'use client'

import { CheckIcon } from '@hugeicons-pro/core-solid-rounded'
import { UserCircleIcon } from '@hugeicons-pro/core-stroke-rounded'
import { Combobox } from '@/components/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { ProjectDetailsFieldRow } from './project-details-field-row'
import type { ProjectDetailsFieldProps } from './project-details-types'

// The lead is picked among the project's own members.
export function ProjectDetailsLeadField({
  workspaceId,
  project,
  canManage,
  pending,
  save,
}: ProjectDetailsFieldProps) {
  const { data: members = [] } = useProjectMembers(workspaceId, project.slug)
  const lead = members.find((m) => m.userId === project.leadId)

  return (
    <ProjectDetailsFieldRow icon={UserCircleIcon} label='Líder'>
      <Combobox
        options={members}
        getValue={(m) => m.userId}
        getSearchText={(m) => `${m.name} ${m.username}`}
        value={project.leadId ?? undefined}
        onChange={(leadId) =>
          leadId !== project.leadId && save({ leadId }, 'Líder atualizado')
        }
        searchPlaceholder='Procurar membro...'
        emptyMessage='Nenhum membro encontrado.'
        trigger={
          <Button
            variant='ghost'
            size='sm'
            disabled={!canManage || pending}
            className='w-3/5 justify-start'
          >
            {lead ? (
              <>
                <UserAvatar size='sm' name={lead.name} image={lead.image} />@
                {lead.username}
              </>
            ) : (
              'Sem líder'
            )}
          </Button>
        }
        renderItem={(m, selected) => (
          <>
            <UserAvatar size='sm' name={m.name} image={m.image} />
            <span className='flex-1'>@{m.username}</span>
            {selected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
          </>
        )}
      />
    </ProjectDetailsFieldRow>
  )
}
