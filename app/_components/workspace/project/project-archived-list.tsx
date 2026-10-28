'use client'

import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { useProjects } from '@/src/hooks/use-project'
import { sortFieldParser, sortOrderParser } from '@/src/lib/project-params'
import type { ProjectDTO } from '@/types/project'
import { ProjectArchivedCard } from './project-archived-card'
import { ProjectCardSkeleton } from './project-card-skeleton'

interface ProjectArchivedListProps {
  workspaceId: string
}

export function ProjectArchivedList({ workspaceId }: ProjectArchivedListProps) {
  const { data: projects, isLoading, isError } = useProjects(workspaceId, true)
  const [{ sortField, sortOrder }] = useQueryStates({
    sortField: sortFieldParser,
    sortOrder: sortOrderParser,
  })

  const sorted = useMemo<ProjectDTO[]>(() => {
    if (!projects) return []

    return [...projects].sort((a, b) => {
      const cmp =
        sortField === 'name'
          ? a.name.localeCompare(b.name)
          : a.updatedAt.localeCompare(b.updatedAt)
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [projects, sortField, sortOrder])

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 p-5'>
        {Array.from({ length: 3 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex items-center justify-center h-64 text-sm text-muted-foreground'>
        Não foi possível carregar os projetos arquivados. Tente novamente.
      </div>
    )
  }

  if (!sorted.length) {
    return (
      <div className='flex items-center justify-center h-64 text-sm text-muted-foreground'>
        Nenhum projeto arquivado.
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 p-5'>
      {sorted.map((project) => (
        <ProjectArchivedCard
          key={project.id}
          project={project}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  )
}
