'use client'

import { Add01Icon, ZapIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { useProject } from '@/src/hooks/use-project'
import { useCreateUpdate, useUpdates } from '@/src/hooks/use-update'
import { useUser } from '@/src/hooks/use-user'
import { ProjectDisabledField } from '../project-disabled-field'
import { ProjectUpdateCard } from './project-update-card'
import { ProjectUpdateForm } from './project-update-form'
import type { ProjectUpdateHealth } from './project-update-health'

export function ProjectDetailsUpdates({
  workspaceId,
  projectSlug,
  canManage,
}: {
  workspaceId: string
  projectSlug: string
  canManage: boolean
}) {
  const { 'workspace-slug': workspaceSlug } = useParams<{
    'workspace-slug': string
  }>()
  const { data: project } = useProject(workspaceId, projectSlug)
  const { data: viewer } = useUser()
  const [composing, setComposing] = useState(false)

  const enabled = project?.updatesEnabled === true
  const updates = useUpdates(workspaceId, projectSlug, { enabled })
  const create = useCreateUpdate(workspaceId, projectSlug)

  if (!project) return <Skeleton className='h-32 w-full' />

  if (!project.updatesEnabled) {
    return (
      <ProjectDisabledField
        icon={ZapIcon}
        title='Atualizações'
        description={
          canManage
            ? 'Este recurso está desativado. Ative nas configurações do projeto.'
            : 'Este recurso está desativado. Peça a um admin para ativá-lo.'
        }
        href={
          canManage
            ? `/${workspaceSlug}/projects/${projectSlug}/settings/project-updates`
            : null
        }
      />
    )
  }

  const items = updates.data?.pages.flatMap((page) => page.updates) ?? []

  function handleCreate(values: {
    status: ProjectUpdateHealth
    content: string
  }) {
    return notify
      .run(
        create.mutateAsync({
          status: values.status,
          content: values.content || undefined,
        }),
        {
          loading: 'Publicando...',
          success: 'Atualização publicada',
          error: 'Erro ao publicar atualização',
        },
      )
      .then((ok) => {
        if (ok) setComposing(false)
        return ok
      })
  }

  const showForm = composing || (updates.isSuccess && items.length === 0)
  const isFirst = updates.isSuccess && items.length === 0

  return (
    <div className='space-y-2'>
      <div className='space-y-3 pb-6 w-full'>
        <div className='w-full flex items-center justify-between'>
          {items.length > 0 && (
            <Button
              size='sm'
              variant='outline'
              disabled={composing}
              onClick={() => setComposing(true)}
            >
              <NexoIcon icon={Add01Icon} strokeWidth={2} />
              Adicionar atualização
            </Button>
          )}
        </div>
      </div>
      <div className='space-y-6'>
        {showForm && (
          <ProjectUpdateForm
            pending={create.isPending}
            placeholder={
              isFirst
                ? 'Compartilhe como o projeto está indo. Ninguém publicou nada ainda.'
                : undefined
            }
            onSubmit={handleCreate}
            onCancel={isFirst ? undefined : () => setComposing(false)}
          />
        )}
        {updates.isPending && <Skeleton className='h-40 w-full' />}
        {updates.isError && (
          <div className='flex items-center gap-2'>
            <Muted>Não foi possível carregar as atualizações.</Muted>
            <Button size='xs' variant='ghost' onClick={() => updates.refetch()}>
              Tentar de novo
            </Button>
          </div>
        )}
        {items.map((update) => (
          <ProjectUpdateCard
            key={update.id}
            update={update}
            workspaceId={workspaceId}
            projectSlug={projectSlug}
            viewerId={viewer?.id}
            canManage={canManage}
          />
        ))}
        {updates.hasNextPage && (
          <Button
            size='sm'
            variant='ghost'
            disabled={updates.isFetchingNextPage}
            onClick={() => updates.fetchNextPage()}
          >
            Carregar mais
          </Button>
        )}
      </div>
    </div>
  )
}
