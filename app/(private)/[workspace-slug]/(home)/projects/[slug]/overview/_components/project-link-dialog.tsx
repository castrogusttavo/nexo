'use client'

import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import {
  useCreateProjectLink,
  useUpdateProjectLink,
} from '@/src/hooks/use-project-links'
import type { UpdateProjectLinkDTO } from '@/src/schemas/project-link.schema'
import type { ProjectLinkDTO } from '@/types/project-link'

type ProjectLinkDialogProps = {
  workspaceId: string
  projectSlug: string
  /** The link to edit. Leave it out (or null) to add a new one. */
  link?: ProjectLinkDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// The server only accepts http(s); checking here saves a round trip that
// would answer with a generic 422.
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

// One dialog for both flows: with `link` it edits, without it it creates.
export function ProjectLinkDialog({
  open,
  onOpenChange,
  link,
  ...ids
}: ProjectLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='min-w-2xl max-h-[calc(100dvh-10rem)] max-w-[calc(100vw-2rem)] p-0 m-0 bg-app'
      >
        {/* The popup unmounts when closed, and the key restarts the fields
            when the dialog switches from one link to another. */}
        <ProjectLinkForm
          key={link?.id ?? 'new'}
          link={link ?? null}
          onOpenChange={onOpenChange}
          {...ids}
        />
      </DialogContent>
    </Dialog>
  )
}

function ProjectLinkForm({
  workspaceId,
  projectSlug,
  link,
  onOpenChange,
}: Omit<ProjectLinkDialogProps, 'open' | 'link'> & {
  link: ProjectLinkDTO | null
}) {
  const create = useCreateProjectLink(workspaceId, projectSlug)
  const update = useUpdateProjectLink(workspaceId, projectSlug)
  const [url, setUrl] = useState(link?.url ?? '')
  const [title, setTitle] = useState(link?.title ?? '')
  const [touched, setTouched] = useState(false)

  const trimmedUrl = url.trim()
  const urlInvalid = trimmedUrl !== '' && !isHttpUrl(trimmedUrl)
  const pending = create.isPending || update.isPending
  const canSubmit = trimmedUrl !== '' && !urlInvalid && !pending

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    const cleanTitle = title.trim()
    let saved: boolean

    if (link) {
      // Send only what changed; an emptied title clears it (null).
      const data: UpdateProjectLinkDTO = {}
      if (trimmedUrl !== link.url) data.url = trimmedUrl
      if (cleanTitle !== (link.title ?? '')) data.title = cleanTitle || null
      if (Object.keys(data).length === 0) return onOpenChange(false)

      saved = await notify.run(update.mutateAsync({ linkId: link.id, data }), {
        loading: 'Salvando...',
        success: 'Link atualizado',
        error: 'Erro ao atualizar link',
      })
    } else {
      saved = await notify.run(
        create.mutateAsync({
          url: trimmedUrl,
          title: cleanTitle || undefined,
        }),
        {
          loading: 'Adicionando...',
          success: 'Link adicionado',
          error: 'Erro ao adicionar link',
        },
      )
    }

    if (saved) onOpenChange(false)
  }

  return (
    <form onSubmit={submit} className='flex flex-col min-h-0 gap-6'>
      <div className='flex flex-col min-h-0 min-w-0 gap-4 overflow-clip p-4 pb-0'>
        <DialogHeader className='pe-10'>
          <DialogTitle>{link ? 'Edite o link' : 'Adicione o link'}</DialogTitle>
        </DialogHeader>
        <FieldGroup className='gap-3'>
          <Field className='flex flex-col items-start gap-1.5 p-0 m-0'>
            <FieldLabel htmlFor='project-link-url'>URL</FieldLabel>
            <Input
              id='project-link-url'
              type='url'
              maxLength={2048}
              placeholder='Digite ou cole uma URL'
              value={url}
              aria-invalid={touched && urlInvalid}
              onChange={(event) => setUrl(event.target.value)}
              onBlur={() => setTouched(true)}
            />
            {touched && urlInvalid && (
              <FieldError>
                Use uma URL que comece com http:// ou https://
              </FieldError>
            )}
          </Field>
          <Field className='flex flex-col items-start gap-1.5 p-0 m-0'>
            <FieldLabel htmlFor='project-link-title'>Título</FieldLabel>
            <FieldDescription className='text-xs'>Opcional</FieldDescription>
            <Input
              id='project-link-title'
              maxLength={100}
              placeholder='Como você quer ver este link'
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
        </FieldGroup>
      </div>
      <DialogFooter className='flex shrink-0 items-center justify-end gap-2 border-t border-border p-4'>
        <Button
          type='button'
          variant='outline'
          size='xs'
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button type='submit' size='xs' disabled={!canSubmit}>
          {link ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
