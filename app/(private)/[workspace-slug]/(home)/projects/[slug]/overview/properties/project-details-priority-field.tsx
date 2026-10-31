'use client'

import { SignalFull02Icon } from '@hugeicons-pro/core-solid-rounded'
import { issuePrioritiesIcon } from '@/app/_components/workspace/project/issue/issue-icons'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProjectDTO } from '@/types/project'
import { ProjectDetailsFieldRow } from './project-details-field-row'
import type { ProjectDetailsFieldProps } from './project-details-types'

// Five fixed options: a plain menu, with no search.
export function ProjectDetailsPriorityField({
  project,
  canManage,
  pending,
  save,
}: ProjectDetailsFieldProps) {
  const priority = issuePrioritiesIcon.find(
    (p) => p.priority === project.priority,
  )

  return (
    <ProjectDetailsFieldRow
      icon={SignalFull02Icon}
      label='Prioridade'
      strokeWidth={0}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              size='sm'
              disabled={!canManage || pending}
              className='w-3/5 justify-start'
            >
              {priority && (
                <NexoIcon
                  icon={priority.icon}
                  strokeWidth={priority.strokeWidth}
                  className={priority.color}
                />
              )}
              {priority?.label ?? 'Prioridade'}
            </Button>
          }
        />
        <DropdownMenuContent align='start'>
          <DropdownMenuRadioGroup
            value={project.priority}
            onValueChange={(next) =>
              save(
                { priority: next as ProjectDTO['priority'] },
                'Prioridade atualizada',
              )
            }
          >
            {issuePrioritiesIcon.map((p) => (
              <DropdownMenuRadioItem key={p.priority} value={p.priority}>
                <NexoIcon
                  icon={p.icon}
                  strokeWidth={p.strokeWidth}
                  className={p.color}
                />
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ProjectDetailsFieldRow>
  )
}
