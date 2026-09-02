'use client'

import * as React from 'react'
import { CommentPlugin } from '@platejs/comment/react'
import { YjsPlugin } from '@platejs/yjs/react'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { ptBR } from 'date-fns/locale/pt-BR'
import { CheckIcon, MoreHorizontalIcon, PencilIcon, SendIcon, TrashIcon, XIcon } from 'lucide-react'
import type { Value } from 'platejs'
import { useEditorRef } from 'platejs/react'
import { discussionPlugin } from '@/components/editor/plugins/discussion-plugin'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { useWikiEditorContext } from '@/src/hooks/use-wiki-editor-context'
import {
  useCreateWikiComment,
  useDeleteWikiComment,
  useResolveWikiComment,
  useUpdateWikiComment,
  useWikiComments,
} from '@/src/hooks/use-wiki-comment'
import type { WikiCommentDTO } from '@/types/wiki-comment'

// O corpo do comentário é texto puro, embrulhado no shape de Value que a API
// espera — o composer não é um editor Plate aninhado, é uma simplificação
// deliberada (sem negrito/menção/etc dentro do comentário).
function textToValue(text: string): Value {
  return [{ type: 'p', children: [{ text }] }]
}

function valueToText(value: Value): string {
  return value
    .map((node) =>
      'children' in node
        ? node.children.map((child) => ('text' in child ? child.text : '')).join('')
        : '',
    )
    .join('\n')
}

export function DiscussionThread({ markId }: { markId: string }) {
  const editor = useEditorRef()
  const { workspaceId, wikiPageId, userId } = useWikiEditorContext()
  const { data: comments = [] } = useWikiComments(workspaceId, wikiPageId)
  const createComment = useCreateWikiComment(workspaceId, wikiPageId)
  const updateComment = useUpdateWikiComment(workspaceId, wikiPageId)
  const resolveComment = useResolveWikiComment(workspaceId, wikiPageId)
  const deleteComment = useDeleteWikiComment(workspaceId, wikiPageId)

  const thread = comments
    .filter((c) => c.markId === markId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const root = thread.find((c) => !c.parentId)

  const [reply, setReply] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingText, setEditingText] = React.useState('')

  function removeMark() {
    editor.getTransforms(CommentPlugin).comment.unsetMark({ id: markId })
    editor.setOption(discussionPlugin, 'activeId', null)
  }

  // Broadcast to other collaborators viewing this page: bump this client's
  // own awareness state, reusing the same Hocuspocus connection the document
  // already holds open. See discussion-overlay.tsx for the listening side.
  function broadcastCommentsChanged() {
    editor
      .getOption(YjsPlugin, 'awareness')
      ?.setLocalStateField('wikiCommentsRev', Date.now())
  }

  function handleSubmit() {
    const text = reply.trim()
    if (!text) return
    createComment.mutate(
      { markId, content: textToValue(text), parentId: root?.id },
      {
        onSuccess: () => {
          setReply('')
          broadcastCommentsChanged()
        },
      },
    )
  }

  function handleDelete(comment: WikiCommentDTO) {
    const isLastInThread = thread.length === 1
    deleteComment.mutate(comment.id, {
      onSuccess: () => {
        if (isLastInThread) removeMark()
        broadcastCommentsChanged()
      },
    })
  }

  function handleResolveRoot() {
    if (!root) return
    resolveComment.mutate(
      { commentId: root.id, resolved: !root.resolved },
      { onSuccess: broadcastCommentsChanged },
    )
  }

  function handleSaveEdit(comment: WikiCommentDTO, text: string) {
    if (!text.trim()) return
    updateComment.mutate(
      { commentId: comment.id, content: textToValue(text.trim()) },
      {
        onSuccess: () => {
          setEditingId(null)
          broadcastCommentsChanged()
        },
      },
    )
  }

  return (
    <div className='flex max-h-96 flex-col'>
      <div className='flex-1 overflow-y-auto p-3'>
        {thread.length === 0 && (
          <p className='text-muted-foreground text-sm'>
            Nenhum comentário ainda.
          </p>
        )}
        {thread.map((comment, index) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            index={index}
            isLast={index === thread.length - 1}
            isOwn={comment.author.id === userId}
            isRoot={!comment.parentId}
            isEditing={editingId === comment.id}
            editingText={editingText}
            onStartEdit={() => {
              setEditingId(comment.id)
              setEditingText(valueToText(comment.content))
            }}
            onEditingTextChange={setEditingText}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={(text) => handleSaveEdit(comment, text)}
            onDelete={() => handleDelete(comment)}
            onResolve={handleResolveRoot}
            resolved={!!root?.resolved}
          />
        ))}
      </div>

      <div className='flex items-center gap-2 border-t p-2'>
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={root ? 'Responder...' : 'Escreva um comentário...'}
          className='min-h-9 flex-1 resize-none text-sm'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <Button
          size='icon'
          className='size-8 shrink-0'
          onClick={handleSubmit}
          disabled={!reply.trim()}
        >
          <SendIcon className='size-4' />
        </Button>
      </div>

      {thread.length === 0 && (
        <div className='flex items-center justify-end border-t px-2 py-1.5'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 text-xs'
            onClick={removeMark}
          >
            <XIcon className='size-3.5' />
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  index,
  isLast,
  isOwn,
  isRoot,
  isEditing,
  editingText,
  resolved,
  onStartEdit,
  onEditingTextChange,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onResolve,
}: {
  comment: WikiCommentDTO
  index: number
  isLast: boolean
  isOwn: boolean
  isRoot: boolean
  isEditing: boolean
  editingText: string
  resolved: boolean
  onStartEdit: () => void
  onEditingTextChange: (text: string) => void
  onCancelEdit: () => void
  onSaveEdit: (text: string) => void
  onDelete: () => void
  onResolve: () => void
}) {
  const [hovering, setHovering] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const showActions = hovering || dropdownOpen

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className='relative flex items-center'>
        <Avatar className='size-5'>
          <AvatarImage alt={comment.author.name} src={comment.author.image ?? undefined} />
          <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
        </Avatar>
        <h4 className='mx-2 font-semibold text-sm leading-none'>{comment.author.name}</h4>
        <span className='text-muted-foreground/80 text-xs leading-none'>
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
        </span>

        {(index === 0 || isOwn) && showActions && (
          <div className='absolute top-0 right-0 flex gap-1'>
            {index === 0 && isRoot && (
              <Button
                variant='ghost'
                size='icon'
                className='size-6 text-muted-foreground'
                onClick={onResolve}
                title={resolved ? 'Reabrir' : 'Resolver'}
              >
                <CheckIcon className='size-3.5' />
              </Button>
            )}
            {isOwn && (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger
                  render={
                    <Button variant='ghost' size='icon' className='size-6 text-muted-foreground'>
                      <MoreHorizontalIcon className='size-3.5' />
                    </Button>
                  }
                />
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={onStartEdit}>
                    <PencilIcon />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete}>
                    <TrashIcon />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <div className='relative my-1 pl-[26px]'>
        {!isLast && (
          <div className='absolute top-0 left-3 h-full w-0.5 shrink-0 bg-muted' />
        )}
        {isEditing ? (
          <div className='flex flex-col gap-1'>
            <Textarea
              autoFocus
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              className='min-h-16 text-sm'
            />
            <div className='flex justify-end gap-1'>
              <Button size='sm' variant='ghost' onClick={onCancelEdit}>
                Cancelar
              </Button>
              <Button size='sm' onClick={() => onSaveEdit(editingText)}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <p className='whitespace-pre-wrap text-sm'>{valueToText(comment.content)}</p>
        )}
      </div>
    </div>
  )
}
