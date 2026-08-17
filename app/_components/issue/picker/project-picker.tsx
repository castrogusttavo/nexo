'use client'

import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/src/hooks/use-project'
import { Combobox } from '../../ui/combobox'

interface ProjectPickerProps {
  workspaceId: string
  value: string | undefined
  onChange: (projectSlug: string) => void
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
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
        <Button variant={buttonVariant} size='xs' className='h-8'>
          {selected
            ? `${selected.emoji ?? ''} ${selected.name}`.trim()
            : 'Projeto'}
        </Button>
      }
      renderItem={(project) => `${project.emoji ?? ''} ${project.name}`.trim()}
    />
  )
}
