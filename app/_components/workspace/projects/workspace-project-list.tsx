'use client'

import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useProjects } from '@/src/hooks/use-project'
import {
  accessParser,
  createdAtParser,
  dateFromParser,
  dateToParser,
  mineParser,
  sortFieldParser,
  sortOrderParser,
} from '@/src/lib/project-params'
import type { ProjectDTO } from '@/types/project'
import { ProjectCard } from './card/workspace-project-card'

interface ProjectListProps {
  workspaceId: string
  workspaceSlug: string
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isYesterday(dateStr: string) {
  const d = new Date(dateStr)
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return d.toDateString() === y.toDateString()
}

function isWithinDays(dateStr: string, days: number) {
  return new Date(dateStr).getTime() >= Date.now() - days * 86_400_000
}

export function ProjectList({ workspaceId, workspaceSlug }: ProjectListProps) {
  const { data: projects, isLoading, isError } = useProjects(workspaceId)
  const [{ mine, access, createdAt, dateFrom, dateTo, sortField, sortOrder }] =
    useQueryStates({
      mine: mineParser,
      access: accessParser,
      createdAt: createdAtParser,
      dateFrom: dateFromParser,
      dateTo: dateToParser,
      sortField: sortFieldParser,
      sortOrder: sortOrderParser,
    })

  const filtered = useMemo<ProjectDTO[]>(() => {
    if (!projects) return []
    let result = [...projects]

    if (mine) result = result.filter((p) => p.leadId !== undefined)
    if (access.includes('public') && !access.includes('private')) {
      result = result.filter((p) => p.isPublic)
    } else if (access.includes('private') && !access.includes('public')) {
      result = result.filter((p) => !p.isPublic)
    }

    if (dateFrom) {
      const from = dateFrom.getTime()
      const toBase = dateTo ?? dateFrom
      const to = new Date(
        toBase.getFullYear(),
        toBase.getMonth(),
        toBase.getDate(),
        23,
        59,
        59,
        999,
      ).getTime()
      result = result.filter((p) => {
        const t = new Date(p.createdAt).getTime()
        return t >= from && t <= to
      })
    } else if (createdAt === 'today') {
      result = result.filter((p) => isToday(p.createdAt))
    } else if (createdAt === 'yesterday') {
      result = result.filter((p) => isYesterday(p.createdAt))
    } else if (createdAt === '7days') {
      result = result.filter((p) => isWithinDays(p.createdAt, 7))
    } else if (createdAt === '30days') {
      result = result.filter((p) => isWithinDays(p.createdAt, 30))
    }

    result.sort((a, b) => {
      const cmp =
        sortField === 'name'
          ? a.name.localeCompare(b.name, 'pt-BR')
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [
    projects,
    mine,
    access,
    createdAt,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
  ])

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
        Não foi possível carregar os projetos. Tente novamente.
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div className='flex items-center justify-center h-64 text-sm text-muted-foreground'>
        {projects?.length
          ? 'Nenhum projeto corresponde aos filtros.'
          : 'Nenhum projeto encontrado. Crie seu primeiro projeto.'}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 p-5'>
      {filtered.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  )
}

function ProjectCardSkeleton() {
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
