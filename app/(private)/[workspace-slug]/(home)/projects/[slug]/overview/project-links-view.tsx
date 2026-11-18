'use client'

import {
  Copy01Icon,
  Link04Icon,
  Pen01Icon,
  TrashIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { notify } from '@/lib/notify'
import {
  useProjectLinks,
  useRemoveProjectLink,
} from '@/src/hooks/use-project-links'
import type { ProjectLinkDTO } from '@/types/project-link'
import { ProjectLinkDialog } from './project-link-dialog'

export function ProjectLinksView({
  workspaceId,
  projectSlug,
  canManage,
}: {
  workspaceId: string
  projectSlug: string
  canManage: boolean
}) {
  const { data: links } = useProjectLinks(workspaceId, projectSlug)
  const remove = useRemoveProjectLink(workspaceId, projectSlug)
  // `editing` outlives the dialog so the exit animation keeps showing the
  // link being edited instead of flipping to the create form.
  const [editing, setEditing] = useState<ProjectLinkDTO | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  if (!links || links.length === 0) return null

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      notify.success('Link copiado')
    } catch {
      notify.error(null, 'Não foi possível copiar o link')
    }
  }

  return (
    <div className='pb-6 border-b border-border flex flex-col gap-3'>
      <Accordion className='w-full' defaultValue={['links']}>
        <AccordionItem value='links'>
          <AccordionTrigger className='hover:no-underline! gap-2'>
            Links <Muted>{links.length}</Muted>
          </AccordionTrigger>
          <AccordionContent className='flex flex-col gap-2.5'>
            {links.map((link) => (
              <div
                key={link.id}
                className='bg-muted w-full p-2.5 flex items-start justify-between rounded-md'
              >
                <div className='flex items-start gap-2 truncate'>
                  <NexoIcon
                    icon={Link04Icon}
                    strokeWidth={2}
                    className='py-1 size-6'
                  />
                  <div className='flex flex-col gap-0.5 truncate'>
                    <Muted className='text-sm font-medium'>
                      <a
                        href={link.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary no-underline! hover:underline!'
                      >
                        {link.url}
                      </a>{' '}
                      {link.title ? ` ${link.title}` : null}
                    </Muted>
                    <Muted className='text-xs font-medium'>
                      Adicionado em {formatRelativeTime(link.createdAt)}
                    </Muted>
                  </div>
                </div>
                <div>
                  {canManage && (
                    <Button
                      aria-label='Editar link'
                      size='icon-xs'
                      variant='ghost'
                      onClick={() => {
                        setEditing(link)
                        setEditOpen(true)
                      }}
                    >
                      <NexoIcon icon={Pen01Icon} strokeWidth={2} />
                    </Button>
                  )}
                  <Button
                    aria-label='Copiar link'
                    size='icon-xs'
                    variant='ghost'
                    onClick={() => copy(link.url)}
                  >
                    <NexoIcon icon={Copy01Icon} strokeWidth={2} />
                  </Button>
                  {canManage && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          aria-label='Remover link'
                          size='icon-xs'
                          variant='ghost'
                        >
                          <NexoIcon icon={TrashIcon} strokeWidth={2} />
                        </Button>
                      }
                      title='Remover link'
                      description='O link deixa de aparecer neste projeto. Isso não pode ser desfeito.'
                      confirmLabel='Remover'
                      pendingLabel='Removendo...'
                      pending={remove.isPending}
                      onConfirm={() =>
                        notify.run(remove.mutateAsync(link.id), {
                          loading: 'Removendo...',
                          success: 'Link removido',
                          error: 'Erro ao remover link',
                        })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <ProjectLinkDialog
        workspaceId={workspaceId}
        projectSlug={projectSlug}
        link={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
