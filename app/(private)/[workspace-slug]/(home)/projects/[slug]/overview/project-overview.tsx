'use client'

import { Activity02Icon, Link04Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { ProjectCoverImagePicker } from '@/app/_components/workspace/project/create/project-cover-image-picker'
import { ProjectEmojiIconPicker } from '@/app/_components/workspace/project/create/project-emoji-icon-picker'
import { ProjectDocumentEditor } from '@/app/_components/workspace/project/document/project-document-editor'
import { NexoIcon } from '@/components/icon/icon'
import { DetailsPanelToggle } from '@/components/layouts/details-panel'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { notify } from '@/lib/notify'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'
import { ProjectAttachmentButton } from './project-attachment-button'
import { ProjectAttachmentsView } from './project-attachments-view'
import { PROJECT_DETAILS_ID, ProjectDetails } from './project-details'
import { ProjectLinkDialog } from './project-link-dialog'
import { ProjectLinksView } from './project-links-view'
import { ProjectProgressView } from './project-progress-view'
import { ProjectReactionList } from './project-reaction-list'

function ProjectOverviewHero({
  workspaceId,
  projectSlug,
  canManage,
}: {
  workspaceId: string
  projectSlug: string
  canManage: boolean
}) {
  const { data: project } = useProject(workspaceId, projectSlug)
  const update = useUpdateProject(workspaceId, projectSlug)

  if (!project) return null

  const save = (data: Parameters<typeof update.mutateAsync>[0]) =>
    notify.run(update.mutateAsync(data), {
      loading: 'Salvando...',
      success: 'Projeto atualizado',
      error: 'Erro ao atualizar projeto',
    })

  return (
    <div>
      <div className='relative h-29.5 w-full'>
        {project.coverImage && (
          <img
            src={project.coverImage}
            alt=''
            className='w-full object-cover absolute left-0 top-0 h-full'
          />
        )}
        {canManage && (
          <div className='absolute right-4 top-4'>
            <ProjectCoverImagePicker
              workspaceId={workspaceId}
              currentImage={project.coverImage ?? undefined}
              onSelect={(coverImage) => save({ coverImage })}
            />
          </div>
        )}
      </div>
      <div className='relative mt-2 px-10 py-5'>
        {canManage ? (
          <div className='absolute -top-6.75 h-10 w-10 shrink-0 grid place-items-center rounded-sm'>
            <ProjectEmojiIconPicker
              currentEmoji={project.emoji ?? undefined}
              onSelect={(emoji) => save({ emoji })}
            />
          </div>
        ) : null}
        <h1 className='text-xl font-semibold mt-5 inline-block max-w-full truncate'>
          {project.name}
        </h1>
      </div>
    </div>
  )
}

export function ProjectOverview({
  workspaceId,
  projectSlug,
  projectId,
  userId,
  userName,
  canManage,
  projectStatesEnabled,
}: {
  workspaceId: string
  projectSlug: string
  projectId: string
  userId: string
  userName: string
  canManage: boolean
  projectStatesEnabled: boolean
}) {
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [open, setOpen] = useState(false)

  return (
    <div className='w-full h-full flex flex-col overflow-hidden'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Visão geral'}>
            <NexoIcon
              icon={Activity02Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <DetailsPanelToggle
          panelId={PROJECT_DETAILS_ID}
          open={detailsOpen}
          onToggle={() => setDetailsOpen((open) => !open)}
        />
      </HeaderInternalNavigation>
      <div className='flex min-h-0 w-full flex-1 items-start justify-between'>
        <div className='h-full flex-1 overflow-y-scroll no-scrollbar'>
          <ProjectOverviewHero
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            canManage={canManage}
          />
          <div className='flex flex-col gap-4 w-full'>
            <ProjectDocumentEditor
              workspaceId={workspaceId}
              projectId={projectId}
              projectSlug={projectSlug}
              userId={userId}
              userName={userName}
              canManage={canManage}
            />
            <div className='px-10'>
              <div className='flex items-center justify-between border-b border-border pb-6'>
                <ProjectReactionList
                  workspaceId={workspaceId}
                  projectSlug={projectSlug}
                />
                {canManage && (
                  <div className='bg-primary-foreground border border-border rounded-lg flex w-fit gap-1 p-0.5'>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label='Adicionar link'
                            onClick={() => setOpen(true)}
                          >
                            <NexoIcon icon={Link04Icon} strokeWidth={2} />
                          </Button>
                        }
                      />
                      <TooltipContent>Adicionar link</TooltipContent>
                    </Tooltip>
                    <ProjectAttachmentButton
                      workspaceId={workspaceId}
                      projectSlug={projectSlug}
                    />
                    <ProjectLinkDialog
                      workspaceId={workspaceId}
                      projectSlug={projectSlug}
                      open={open}
                      onOpenChange={setOpen}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className='px-10 py-8'>
            <ProjectProgressView
              workspaceId={workspaceId}
              projectSlug={projectSlug}
            />
            <ProjectLinksView
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              canManage={canManage}
            />
            <ProjectAttachmentsView
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              canManage={canManage}
            />
          </div>
        </div>
        <ProjectDetails
          open={detailsOpen}
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          canManage={canManage}
          projectStatesEnabled={projectStatesEnabled}
        />
      </div>
    </div>
  )
}
