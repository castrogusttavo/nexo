'use client'

import {
  BookOpen02Icon,
  FileArchiveIcon,
  Image01Icon,
  TrashIcon,
  Video01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
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
import { formatBytes } from '@/lib/format-bytes'
import { notify } from '@/lib/notify'
import {
  useProjectAttachments,
  useRemoveProjectAttachment,
} from '@/src/hooks/use-project-attachments'

function iconFor(contentType: string) {
  if (contentType.startsWith('image/')) return Image01Icon
  if (contentType.startsWith('video/')) return Video01Icon
  if (contentType === 'application/zip') return FileArchiveIcon
  return BookOpen02Icon // pdf, txt, csv
}

export function ProjectAttachmentsView({
  workspaceId,
  projectSlug,
  canManage,
}: {
  workspaceId: string
  projectSlug: string
  canManage: boolean
}) {
  const { data: attachments } = useProjectAttachments(workspaceId, projectSlug)
  const remove = useRemoveProjectAttachment(workspaceId, projectSlug)

  if (!attachments || attachments.length === 0) return null

  return (
    <div className='pb-6 flex flex-col gap-3'>
      <Accordion className='w-full' defaultValue={['attachments']}>
        <AccordionItem value='attachments'>
          <AccordionTrigger className='hover:no-underline! gap-2'>
            Anexos <Muted>{attachments.length}</Muted>
          </AccordionTrigger>
          <AccordionContent className='flex flex-col gap-2.5'>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className='hover:bg-primary-foreground w-full flex items-center justify-between rounded-md h-11 pl-3 pr-2'
              >
                <div className='flex items-center gap-3 truncate'>
                  <NexoIcon
                    icon={iconFor(attachment.contentType)}
                    strokeWidth={2}
                    size={16}
                  />
                  {/* The signed URL asks for Content-Disposition: attachment,
                      so the browser saves the file instead of opening it. */}
                  <a
                    href={attachment.url}
                    download={attachment.fileName}
                    className='truncate text-sm hover:underline'
                  >
                    {attachment.fileName}
                  </a>
                  <Muted className='shrink-0 text-xs'>
                    {formatBytes(attachment.size)}
                  </Muted>
                </div>
                {canManage && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size='icon-sm'
                        variant='ghost'
                        aria-label='Remover anexo'
                      >
                        <NexoIcon icon={TrashIcon} strokeWidth={2} />
                      </Button>
                    }
                    title='Remover anexo'
                    description='O arquivo será apagado do projeto. Isso não pode ser desfeito.'
                    confirmLabel='Remover'
                    pendingLabel='Removendo...'
                    destructive
                    pending={remove.isPending}
                    onConfirm={() =>
                      notify.run(remove.mutateAsync(attachment.id), {
                        loading: 'Removendo...',
                        success: 'Anexo removido',
                        error: 'Erro ao remover anexo',
                      })
                    }
                  />
                )}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
