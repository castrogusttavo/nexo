'use client'

import { CircleDotIcon } from '@hugeicons-pro/core-stroke-rounded'
import { projectStateGroupMeta } from '@/app/_components/workspace/project/project-state-groups'
import { Combobox } from '@/components/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import { useProjectStates } from '@/src/hooks/use-project-state'
import { ProjectDetailsFieldRow } from './project-details-field-row'
import type { ProjectDetailsFieldProps } from './project-details-types'

export function ProjectDetailsStateField({
  workspaceId,
  project,
  canManage,
  pending,
  save,
}: ProjectDetailsFieldProps) {
  const { data: states = [] } = useProjectStates(workspaceId)
  const state = states.find((s) => s.id === project.stateId)

  return (
    <ProjectDetailsFieldRow icon={CircleDotIcon} label='Estado'>
      <Combobox
        options={states}
        getValue={(s) => s.id}
        getSearchText={(s) => s.name}
        value={project.stateId}
        onChange={(stateId) => save({ stateId }, 'Estado atualizado')}
        searchPlaceholder='Procurar estado...'
        emptyMessage='Nenhum estado encontrado.'
        trigger={
          <Button
            variant='ghost'
            size='sm'
            disabled={!canManage || pending}
            className='w-3/5 justify-start'
          >
            {state ? (
              <>
                <NexoIcon
                  icon={projectStateGroupMeta[state.group].icon}
                  className={cn(colorToText(state.color))}
                />
                {state.name}
              </>
            ) : (
              'Sem estado'
            )}
          </Button>
        }
        renderItem={(s) => (
          <div className='flex items-center gap-1.5'>
            <NexoIcon
              icon={projectStateGroupMeta[s.group].icon}
              className={cn(colorToText(s.color))}
            />
            {s.name}
          </div>
        )}
      />
    </ProjectDetailsFieldRow>
  )
}
