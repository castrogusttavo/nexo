'use client'

import { CheckIcon } from '@hugeicons-pro/core-solid-rounded'
import { Tag01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { Combobox } from '@/components/combobox'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { colorToText } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import { useProjectLabels } from '@/src/hooks/use-project-label'
import { ProjectDetailsFieldRow } from './project-details-field-row'
import type { ProjectDetailsFieldProps } from './project-details-types'

// `labelIds` replaces the whole set, so the combobox hands back the new list.
export function ProjectDetailsLabelsField({
  workspaceId,
  project,
  canManage,
  pending,
  save,
}: ProjectDetailsFieldProps) {
  const { data: labels = [] } = useProjectLabels(workspaceId)
  const count = project.labelIds.length

  return (
    <ProjectDetailsFieldRow icon={Tag01Icon} label='Etiquetas'>
      <Combobox
        multiple
        options={labels}
        getValue={(l) => l.id}
        getSearchText={(l) => l.name}
        value={project.labelIds}
        onChange={(labelIds) => save({ labelIds }, 'Etiquetas atualizadas')}
        searchPlaceholder='Procurar etiqueta...'
        emptyMessage='Nenhuma etiqueta encontrada.'
        trigger={
          <Button
            variant='ghost'
            size='sm'
            disabled={!canManage || pending}
            className='w-3/5 justify-start'
          >
            {count === 0
              ? 'Sem etiquetas'
              : `${count} ${count === 1 ? 'etiqueta' : 'etiquetas'}`}
          </Button>
        }
        renderItem={(l, selected) => (
          <div className='w-full flex items-center justify-between'>
            <span className='flex items-center gap-1.5'>
              <NexoIcon
                icon={Tag01Icon}
                size={14}
                className={cn(colorToText(l.color))}
              />
              {l.name}
            </span>
            {selected && <NexoIcon icon={CheckIcon} strokeWidth={2} />}
          </div>
        )}
      />
    </ProjectDetailsFieldRow>
  )
}
