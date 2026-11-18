'use client'

import { useState } from 'react'
import { ProjectReactionPicker } from '@/app/_components/workspace/project/project-reaction-picker'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { notify } from '@/lib/notify'
import { displayUserName } from '@/lib/removed-user'
import { cn } from '@/lib/utils'
import {
  useCreateUpdateReply,
  useDeleteUpdate,
  useDeleteUpdateReply,
  useEditUpdate,
  useEditUpdateReply,
  useToggleUpdateReaction,
  useUpdateReplies,
} from '@/src/hooks/use-update'
import type { UpdateDTO } from '@/types/updates'
import { ProjectUpdateForm } from './project-update-form'
import { PROJECT_UPDATE_HEALTH } from './project-update-health'
import { ProjectUpdateMenu } from './project-update-menu'
import { ProjectUpdateReplyForm } from './project-update-reply-form'
import { ProjectUpdateReplyList } from './project-update-reply-list'

type ProjectUpdateCardProps = {
  update: UpdateDTO
  workspaceId: string
  projectSlug: string
  viewerId?: string
  canManage: boolean
}

export function ProjectUpdateCard({
  update,
  workspaceId,
  projectSlug,
  viewerId,
  canManage,
}: ProjectUpdateCardProps) {
  const [editing, setEditing] = useState(false)
  const [repliesOpen, setRepliesOpen] = useState(false)
  // Bumped by "Responder" to move the focus to the reply field, alse when the
  // panel was already open.
  const [focusKey, setFocusKey] = useState(0)

  const edit = useEditUpdate(workspaceId, projectSlug)
  const remove = useDeleteUpdate(workspaceId, projectSlug)
  const react = useToggleUpdateReaction(workspaceId, projectSlug)

  const replies = useUpdateReplies(workspaceId, projectSlug, update.id, {
    enabled: repliesOpen,
  })
  const createReply = useCreateUpdateReply(workspaceId, projectSlug, update.id)
  const editReply = useEditUpdateReply(workspaceId, projectSlug, update.id)
  const removeReply = useDeleteUpdateReply(workspaceId, projectSlug, update.id)

  const health = PROJECT_UPDATE_HEALTH[update.status]
  const isAuthor = !!viewerId && update.author?.id === viewerId

  if (editing) {
    return (
      <ProjectUpdateForm
        initial={{ status: update.status, content: update.content ?? '' }}
        submitLabel='Salvar'
        pending={edit.isPending}
        onCancel={() => setEditing(false)}
        onSubmit={(values) =>
          notify
            .run(
              edit.mutateAsync({
                updateId: update.id,
                data: {
                  status: values.status,
                  content: values.content || undefined,
                },
              }),
              {
                loading: 'Salvando',
                success: 'Atualização editada',
                error: 'Erro ao editar atualização',
              },
            )
            .then((ok) => {
              if (ok) setEditing(false)
              return ok
            })
        }
      />
    )
  }

  function handleDelete() {
    notify.run(remove.mutateAsync(update.id), {
      loading: 'Excluindo...',
      success: 'Atualização excluída',
      error: 'Erro ao excluir atualização',
    })
  }

  function openReplies(focus: boolean) {
    setRepliesOpen(true)
    if (focus) setFocusKey((k) => k + 1)
  }

  const count = update.replyCount
  const commentsLabel =
    count === 0
      ? 'Comentar'
      : `${count} ${count === 1 ? 'comentário' : 'comentários'}`

  return (
    <div className='bg-app flex flex-col items-start gap-3 rounded-xl border border-border'>
      <div
        className={cn(
          'w-full flex flex-col gap-3.5 p-3',
          repliesOpen && 'border-b border-border',
        )}
      >
        <div className='flex items-start justify-between w-full'>
          <div className='flex min-w-0 flex-1 items-start gap-2.5'>
            <div
              className={cn(
                'size-6 shrink-0 rounded-sm flex items-center justify-center',
                health.text,
              )}
            >
              <NexoIcon icon={health.icon} />
            </div>
            <div className='space-y-1'>
              <Muted>
                <strong className='text-primary font-medium'>
                  {displayUserName(update.author?.name)}
                </strong>{' '}
                atualizou o status para{' '}
                <span className={health.text}>{health.label}</span>
              </Muted>
              <Muted className='text-xs'>
                {formatRelativeTime(update.createdAt)}
                {update.editedAt && ' · editado'}
              </Muted>
            </div>
          </div>
          <ProjectUpdateMenu
            canEdit={isAuthor}
            canDelete={isAuthor || canManage}
            onEdit={() => setEditing(true)}
            onDelete={handleDelete}
          />
        </div>
        {update.content && (
          <p className='text-sm whitespace-pre-wrap wrap-break-word'>
            {update.content}
          </p>
        )}
        <div className='flex flex-wrap items-center gap-1.5'>
          <div className='flex items-center gap-3'>
            <Button
              size='xs'
              variant='ghost'
              aria-expanded={repliesOpen}
              onClick={() => setRepliesOpen((open) => !open)}
            >
              {commentsLabel}
            </Button>
            {repliesOpen && (
              <Button
                variant='ghost'
                size='xs'
                onClick={() => openReplies(true)}
              >
                Responder
              </Button>
            )}
          </div>
          <div className='h-4 rounded-full w-0.5 bg-muted-foreground/30 mx-1.5' />
          <ProjectReactionPicker
            reactions={update.reactions}
            onToggle={(emoji, reacted) =>
              react.mutate(
                { updateId: update.id, emoji, reacted },
                { onError: (error) => notify.error(error, 'Erro ao reagir') },
              )
            }
          />
        </div>
      </div>
      {repliesOpen && (
        <div className='p-3 w-full flex flex-col gap-6'>
          <ProjectUpdateReplyList
            replies={replies.data ?? []}
            loading={replies.isPending}
            viewerId={viewerId}
            canManage={canManage}
            onEdit={(replyId, content) =>
              notify.run(
                editReply.mutateAsync({ replyId, data: { content } }),
                {
                  loading: 'Salvando...',
                  success: 'Resposta editada',
                  error: 'Erro ao editar resposta',
                },
              )
            }
            onDelete={(replyId) =>
              notify.run(removeReply.mutateAsync(replyId), {
                loading: 'Excluindo...',
                success: 'Resposta excluída',
                error: 'Erro ao excluir resposta',
              })
            }
          />
          <ProjectUpdateReplyForm
            focusKey={focusKey}
            pending={createReply.isPending}
            onSubmit={(content) =>
              notify.run(createReply.mutateAsync({ content }), {
                loading: 'Enviando...',
                success: 'Resposta enviada',
                error: 'Erro ao responder',
              })
            }
          />
        </div>
      )}
    </div>
  )
}
