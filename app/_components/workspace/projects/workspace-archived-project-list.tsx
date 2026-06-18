'use client'

import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useProjects } from '@/src/hooks/use-project'
import { sortFieldParser, sortOrderParser } from '@/src/lib/project-params'
import type { ProjectDTO } from '@/types/project'
import { ArchivedProjectCard } from './card/workspace-archived-project-card'

interface ArchivedProjectListProps {
  workspaceId: string
}

export function ArchivedProjectList({ workspaceId }: ArchivedProjectListProps) {
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
          <ArchivedProjectCardSkeleton key={i} />
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
        <ArchivedProjectCard
          key={project.id}
          project={project}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  )

  function ArchivedProjectCardSkeleton() {
    return (
      <Card className='p-0 gap-0 animate-pulse'>
        <CardHeader className='relative h-30 w-full rounded-t p-0 bg-muted' />
        <CardContent className='h-28 flex flex-col justify-between p-4 gap-3'>
          <div className='space-y-2'>
            <div className='h-3 w-3/4 rounded bg-muted' />
            <div className='h-3 w-1/2 rounded bg-muted' />
          </div>
          <div className='h-6 w-16 rounded bg-muted' />
        </CardContent>
      </Card>
    )
  }
}
