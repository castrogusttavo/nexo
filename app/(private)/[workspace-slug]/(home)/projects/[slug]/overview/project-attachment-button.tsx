'use client'

import { Attachment02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { type ChangeEvent, useRef } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatBytes } from '@/lib/format-bytes'
import { notify } from '@/lib/notify'
import { useUploadProjectAttachment } from '@/src/hooks/use-project-attachments'
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
} from '@/src/lib/attachment-limits'

// What the browser can tell before sending anything; the server checks again.
function rejectionFor(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return `"${file.name}": tipo de arquivo não permitido`
  }
  if (file.size === 0) return `"${file.name}": o arquivo está vazio`
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `"${file.name}" tem ${formatBytes(file.size)}. O máximo é ${formatBytes(MAX_ATTACHMENT_BYTES)}`
  }
  return null
}

// The button opens the OS file picker straight away: it clicks a hidden file
// input, so there is no intermediate dialog.
export function ProjectAttachmentButton({
  workspaceId,
  projectSlug,
}: {
  workspaceId: string
  projectSlug: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadProjectAttachment(workspaceId, projectSlug)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Clearing the value lets the same file be picked again afterwards.
    event.target.value = ''

    for (const file of files) {
      const rejection = rejectionFor(file)
      if (rejection) {
        notify.error(rejection)
        continue
      }

      await notify.run(upload.mutateAsync(file), {
        loading: `Enviando "${file.name}"...`,
        success: `"${file.name}" anexado`,
        error: 'Erro ao enviar anexo',
      })
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon'
              aria-label='Anexar arquivo'
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <NexoIcon icon={Attachment02Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Anexar</TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type='file'
        multiple
        accept={ATTACHMENT_ACCEPT}
        className='hidden'
        tabIndex={-1}
        aria-hidden
        data-testid='project-attachment-input'
        onChange={handleChange}
      />
    </>
  )
}
