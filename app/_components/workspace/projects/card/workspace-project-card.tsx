'use client'

import { StarIcon as StarIconFull } from '@hugeicons-pro/core-solid-rounded'
import {
  GlobalIcon,
  Link01Icon,
  Settings01Icon,
  SquareLock02Icon,
  StarIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
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
import { notify } from '@/lib/notify'
import {
  useFavoriteProject,
  useUnfavoriteProject,
} from '@/src/hooks/use-project'
import type { ProjectDTO } from '@/types/project'
import { ProjectEmoji } from '../workspace-project-emoji'
import { ProjectCardActions } from './workspace-project-card-action-button'
import { ProjectCardMembers } from './workspace-project-card-membres'

interface ProjectCardProps {
  project: ProjectDTO
  workspaceSlug: string
  workspaceId: string
}

export function ProjectCard({
  project,
  workspaceSlug,
  workspaceId,
}: ProjectCardProps) {
  const router = useRouter()
  const favorite = useFavoriteProject(workspaceId)
  const unfavorite = useUnfavoriteProject(workspaceId)

  const favoriting = useRef(false)

  function navigate() {
    router.push(`/${workspaceSlug}/projects/${project.slug}`)
  }

  function goToSettings(e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/${workspaceSlug}/projects/${project.slug}/settings`)
  }

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/${workspaceSlug}/projects/${project.slug}`
    navigator.clipboard.writeText(url)
  }

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    if (favoriting.current) return
    favoriting.current = true
    const mutation = project.isFavorited ? unfavorite : favorite
    mutation.mutate(project.slug, {
      onError: notify.error,
      onSettled: () => {
        favoriting.current = false
      },
    })
  }

  return (
    <div onClick={navigate} className='cursor-pointer'>
      <Card className='p-0 gap-0 groupq'>
        <CardHeader className='relative h-30 w-full rounded-t p-0'>
          {project.coverImage ? (
            <img
              className='absolute object-cover left-0 top-0 h-full w-full rounded-t'
              src={project.coverImage}
              alt=''
            />
          ) : (
            <div className='absolute inset-0 rounded-t bg-linear-to-br from-primary/30 to-primary/10' />
          )}
          <div className='absolute inset-0 z-1 bg-linear-to-t from-black to-black/20 rounded-t' />
          <div className='absolute bottom-4 z-1 flex h-10 w-full items-center justify-between gap-3 px-4'>
            <div className='flex grow items-center gap-2.5 truncate'>
              <Button className='size-9 shrink-0 grid place-items-center rounded-sm bg-black/30 dark:bg-white/30 text-white'>
                <ProjectEmoji value={project.emoji} size={18} />
              </Button>
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
              <ProjectCardActions onClick={copyLink} aria-label='Copiar link'>
                <NexoIcon icon={Link01Icon} strokeWidth={2} />
              </ProjectCardActions>
              <ProjectCardActions
                onClick={toggleFavorite}
                aria-label={project.isFavorited ? 'Desfavoritar' : 'Favoritar'}
              >
                <NexoIcon
                  icon={project.isFavorited ? StarIconFull : StarIcon}
                  strokeWidth={2}
                  className={project.isFavorited ? 'text-yellow-400' : ''}
                />
              </ProjectCardActions>
            </div>
          </div>
        </CardHeader>
        <CardContent className='h-28 flex flex-col justify-between rounded-b-sm p-4'>
          <p className='text-[13px] text-muted-foreground font-medium line-clamp-3'>
            {project.description ?? 'Sem descrição'}
          </p>
          <div className='w-full flex justify-between'>
            <div className='flex items-center gap-2'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size='icon-sm'
                      variant='ghost'
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <NexoIcon
                    icon={project.isPublic ? GlobalIcon : SquareLock02Icon}
                    strokeWidth={2}
                  />
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                  {project.isPublic ? 'Público' : 'Privado'}
                </TooltipContent>
              </Tooltip>
              <ProjectCardMembers leadId={project.leadId} />
            </div>
            <Button size='icon-sm' variant='ghost' onClick={goToSettings}>
              <NexoIcon icon={Settings01Icon} strokeWidth={2} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
