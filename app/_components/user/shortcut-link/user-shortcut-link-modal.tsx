'use client'

import { Add01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateShortLink } from '@/src/hooks/use-short-link'

function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function UserShortcutLinkModal() {
  const createShortLink = useCreateShortLink()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [fieldErrors, setFieldErrors] = useState < {
    title?: string
    url?: string
  }>({})
  const [error, setError] = useState<string | null>(null)

  const isPending = createShortLink.isPending

  function resetForm() {
    setTitle('')
    setUrl('')
    setFieldErrors({})
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm()
    setOpen(next)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const errors: { title?: string; url?: string } = {}
    const trimmedTitle = title.trim()

    if (trimmedTitle.length < 2)
      errors.title = 'O título deve ter pelo menos 2 caracteres'
    if (!isValidUrl(url)) errors.url = 'URL inválida'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      await createShortLink.mutateAsync({ title: trimmedTitle, url })
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar link rápido')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size='xs' variant='link'>
            <NexoIcon icon={Add01Icon} strokeWidth={2} />
            Adicionar link rápido
          </Button>
        }
      />
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Link rápido</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            {error && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {error}
              </div>
            )}
            <Field data-invalid={!!fieldErrors.url || undefined}>
              <FieldLabel>
                URL <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id='url'
                name='url'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
                placeholder='Digite ou cole uma URL'
              />
              {fieldErrors.url && <FieldError>{fieldErrors.url}</FieldError>}
            </Field>
            <Field data-invalid={!!fieldErrors.title || undefined}>
              <FieldLabel>
                Título <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id='title'
                name='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                placeholder='Como você gostaria de ver este link'
              />
              {fieldErrors.title && <FieldError>{fieldErrors.title}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose
              render={
                <Button type='button' variant='outline' disabled={isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adicionando...' : 'Adicionar Link rápido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
