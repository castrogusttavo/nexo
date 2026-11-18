'use client'

import { useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/user-avatar'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { displayUserName } from '@/lib/removed-user'
import type { UpdateReplyDTO } from '@/types/updates'
import { ProjectUpdateMenu } from './project-update-menu'
import { ProjectUpdateReplyForm } from './project-update-reply-form'

type ProjectUpdateReplyListProps = {
  replies: UpdateReplyDTO[]
  loading: boolean
  viewerId?: string
  canManage: boolean
  onEdit: (replyId: string, content: string) => Promise<boolean>
  onDelete: (replyId: string) => Promise<boolean>
}

export function ProjectUpdateReplyList({
  replies,
  loading,
  viewerId,
  canManage,
  onEdit,
  onDelete,
}: ProjectUpdateReplyListProps) {
  if (loading) return <Skeleton className='h-12 w-full' />
  if (replies.length === 0) return null

  return (
    <ul className='flex flex-col'>
      {replies.map((reply) => (
        <ProjectUpdateReplyItem
          key={reply.id}
          reply={reply}
          isAuthor={!!viewerId && reply.author?.id === viewerId}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function ProjectUpdateReplyItem({
  reply,
  isAuthor,
  canManage,
  onEdit,
  onDelete,
}: {
  reply: UpdateReplyDTO
  isAuthor: boolean
  canManage: boolean
  onEdit: (replyId: string, content: string) => Promise<boolean>
  onDelete: (replyId: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const name = displayUserName(reply.author?.name)

  return (
    <li className='group/update-comment flex gap-3 not-last:pb-6'>
      <div className='relative flex w-4 shrink-0 flex-col items-center self-stretch'>
        <UserAvatar
          name={reply.author?.name}
          image={reply.author?.image}
          className='mt-1 size-4'
          fallbackClassName='text-[10px] m-0 p-0'
        />
        <span className='absolute top-5 -bottom-7 left-1/2 -translate-x-1/2 border-s border-strong group-last/update-comment:hidden' />
      </div>
      <div className='space-y-3 flex-1'>
        <div className='space-y-2'>
          <div className='flex min-h-6 items-start gap-2 justify-between w-full'>
            <div className='flex flex-col flex-wrap flex-1 items-start gap-x-2 gap-y-0.5'>
              <Muted>
                <strong className='text-primary font-medium'>{name}</strong>{' '}
                comentou
              </Muted>
              <Muted className='min-h-6 flex gap-2 items-center text-xs'>
                <span className='size-1 shrink-0 rounded-full bg-muted-foreground' />
                <span>
                  {formatRelativeTime(reply.createdAt)}
                  {reply.editedAt && ' · editado'}
                </span>
              </Muted>
            </div>
            <ProjectUpdateMenu
              canEdit={isAuthor}
              canDelete={isAuthor || canManage}
              onEdit={() => setEditing(true)}
              onDelete={() => onDelete(reply.id)}
            />
          </div>
          {editing ? (
            <ProjectUpdateReplyForm
              initialValue={reply.content}
              focusKey={1}
              onCancel={() => setEditing(false)}
              onSubmit={(content) =>
                onEdit(reply.id, content).then((ok) => {
                  if (ok) setEditing(false)
                  return ok
                })
              }
            />
          ) : (
            <p className='text-sm whitespace-pre-wrap wrap-break-word'>
              {reply.content}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}
