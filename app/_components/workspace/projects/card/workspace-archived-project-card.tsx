'use client'

import {
  ArrowReloadHorizontalIcon,
  Delete02Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { NexoIcon } from '@/components/icon/icon'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useDeleteProject, useRestoreProject } from '@/src/hooks/use-project'
import type { ProjectDTO } from '@/types/project'
import { ProjectEmoji } from '../workspace-project-emoji'
import { ProjectCardActions } from './workspace-project-card-action-button'

interface ArchivedProjectCardProps {
  project: ProjectDTO
  workspaceId: string
}

export function ArchivedProjectCard({
  project,
  workspaceId,
}: ArchivedProjectCardProps) {
  const restore = useRestoreProject(workspaceId, project.slug)
  const remove = useDeleteProject(workspaceId, project.slug)

  function handleRestore(e: React.MouseEvent) {
    e.stopPropagation()
    restore.mutate()
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    remove.mutate()
  }

  return (
    <Card className='p-0 gap-0 opacity-80 hover:opacity-100 transition-opacity'>
      <CardHeader className='relative h-30 w-full rounded-t p-0'>
        {project.coverImage ? (
          <img
            className='absolute object-cover left-0 top-0 h-full w-full rounded-t'
            src={project.coverImage}
            alt=''
          />
        ) : (
          <div className='absolute inset-0 rounded-t bg-linear-to-br from-muted/60 to-muted/30' />
        )}
        <div className='absolute inset-0 z-1 bg-linear-to-t from-black to-black/20 rounded-t' />
        <div className='absolute bottom-4 z-1 flex h-10 w-full items-center justify-between gap-3 px-4'>
          <div className='flex grow items-center gap-2.5 truncate'>
            <div className='size-9 shrink-0 grid place-items-center rounded-sm bg-black/30 dark:bg-white/30'>
              <ProjectEmoji value={project.emoji} size={18} />
            </div>
            <div className='flex flex-col gap-0.5'>
              <CardTitle className='text-white truncate'>
                {project.name}
              </CardTitle>
              <CardDescription className='text-xs text-white/70'>
                {project.slug}
              </CardDescription>
            </div>
          </div>
          <div className='flex gap-2.5'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <ProjectCardActions
                    onClick={handleRestore}
                    aria-label='Restaurar projeto'
                    disabled={restore.isPending}
                  >
                    <NexoIcon
                      icon={ArrowReloadHorizontalIcon}
                      strokeWidth={2}
                    />
                  </ProjectCardActions>
                }
              />
              <TooltipContent side='bottom'>Restaurar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <ProjectCardActions
                    onClick={handleDelete}
                    aria-label='Excluir projeto permanentemente'
                    disabled={remove.isPending}
                    className='flex h-7 w-7 items-center justify-center rounded-sm bg-black/30 dark:bg-white/30 text-red-400 hover:text-red-300'
                  >
                    <NexoIcon icon={Delete02Icon} strokeWidth={2} />
                  </ProjectCardActions>
                }
              />
              <TooltipContent side='bottom'>
                Excluir permanentemente
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-28 flex flex-col justify-between rounded-b-sm p-4'>
        <p className='text-[13px] text-muted-foreground font-medium line-clamp-3'>
          {project.description ?? 'Sem descrição'}
        </p>
        {project.archivedAt && (
          <p className='text-xs text-muted-foreground'>
            Arquivado em{' '}
            {format(new Date(project.archivedAt), "dd 'de' MMM 'de' yyyy", {
              locale: ptBR,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
