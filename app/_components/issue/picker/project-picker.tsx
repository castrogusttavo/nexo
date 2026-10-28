'use client'

import type * as React from 'react'
import { WorkspaceProjectEmoji } from '@/app/_components/workspace/projects/workspace-project-emoji'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/src/hooks/use-project'
import type { ProjectDTO } from '@/types/project'
import { Combobox } from '../../ui/combobox'

interface ProjectPickerProps {
  workspaceId: string
  value: string | undefined
  onChange: (projectSlug: string) => void
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}

// `emoji` holds either an emoji or a picked icon as "Name:#color", so it goes
// through WorkspaceProjectEmoji instead of being printed. Decorative either way: the
// control is named by the project, not by its icon.
function ProjectLabel({ project }: { project: ProjectDTO }) {
  return (
    <span className='flex items-center gap-1.5 min-w-0'>
      {project.emoji && (
        <span
          aria-hidden='true'
          className='size-4 shrink-0 grid place-items-center text-sm leading-none'
        >
          <WorkspaceProjectEmoji value={project.emoji} size={14} />
        </span>
      )}
      <span className='truncate'>{project.name}</span>
    </span>
  )
}

export function ProjectPicker({
  workspaceId,
  value,
  onChange,
  buttonVariant = 'outline',
}: ProjectPickerProps) {
  const { data: projects } = useProjects(workspaceId)
  const options = projects ?? []
  const selected = options.find((project) => project.slug === value)

  return (
    <Combobox
      options={options}
      getValue={(project) => project.slug}
      getSearchText={(project) => project.name}
      value={value}
      onChange={onChange}
      emptyMessage='Nenhum resultado.'
      contentClassName='w-56'
      trigger={
        <Button variant={buttonVariant} size='sm' className='h-8'>
          {selected ? <ProjectLabel project={selected} /> : 'Projeto'}
        </Button>
      }
      renderItem={(project) => <ProjectLabel project={project} />}
    />
  )
}
