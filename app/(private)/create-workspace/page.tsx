'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { notify } from '@/lib/notify'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { useCreateWorkspace } from '@/src/hooks/use-workspace'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export default function CreateWorkspacePage() {
  const { push, back } = useRouter()
  const createWorkspace = useCreateWorkspace()
  const { data: user } = useCacheUser()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  // Only read inside handlers (to stop auto-slugging once the user edits the
  // slug), never in render — a ref avoids a needless re-render on first edit.
  const slugTouchedRef = useRef(false)
  const [size, setSize] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    slug?: string
  }>({})

  const isPending = createWorkspace.isPending
  const canSubmit = name.trim().length >= 2 && slug.length >= 2 && !isPending

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setName(value)
    if (!slugTouchedRef.current) setSlug(slugify(value))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    slugTouchedRef.current = true
    setSlug(slugify(e.target.value))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})

    const errors: { name?: string; slug?: string } = {}
    const trimmedName = name.trim()
    if (trimmedName.length < 2)
      errors.name = 'Nome deve ter ao menos 2 caracteres'
    if (slug.length < 2) errors.slug = 'Slug deve ter ao menos 2 caracteres'
    if (!/^[a-z0-9-]+$/.test(slug))
      errors.slug =
        'Slug deve conter apenas letras minúsculas, números e hífens'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      const workspace = await notify.mutate(
        createWorkspace.mutateAsync({
          name: trimmedName,
          slug,
        }),
        {
          loading: 'Criando workspace...',
          success: 'Workspace criado',
          error: 'Erro ao criar workspace',
        },
      )
      push(`/${workspace.slug}`)
    } catch {
      //
    }
  }

  return (
    <div className='h-screen flex items-center px-8'>
      <div className='relative min-w-100 h-full flex items-start justify-center'>
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-secondary' />
        <Image
          src='brand/logo.svg'
          alt='nexo-logo'
          width={142}
          height={40}
          className='relative z-10 py-10'
          priority
        />
      </div>
      <form onSubmit={handleSubmit} className='flex-1 w-full max-w-lg'>
        <FieldSet>
          <FieldLegend className='text-lg! font-semibold'>
            Crie seu workspace
          </FieldLegend>
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.name || undefined}>
              <FieldLabel htmlFor='workspace-name'>
                Nome do seu workspace
              </FieldLabel>
              <Input
                id='workspace-name'
                name='name'
                value={name}
                onChange={handleNameChange}
                placeholder='Algo familiar e reconhecível é sempre melhor.'
                disabled={isPending}
                autoFocus
              />
              {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
            </Field>
            <Field data-invalid={!!fieldErrors.slug || undefined}>
              <FieldLabel htmlFor='workspace-slug'>
                Defina o URL do seu workspace
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>nexo.coodee.dev/</InputGroupText>
                  <InputGroupInput
                    id='workspace-slug'
                    name='slug'
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder='Digite ou cole um URL'
                    disabled={isPending}
                  />
                </InputGroupAddon>
              </InputGroup>
              {fieldErrors.slug && <FieldError>{fieldErrors.slug}</FieldError>}
            </Field>
            <Field className='w-full'>
              <FieldLabel htmlFor='workspace-size'>
                Quantas pessoas usarão este espaço de trabalho?
              </FieldLabel>
              <Select value={size ?? ''} onValueChange={setSize}>
                <SelectTrigger disabled={isPending}>
                  <SelectValue placeholder='Selecione um intervalo' />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className='w-full'>
                  <SelectGroup>
                    <SelectItem value='Apenas eu'>Apenas eu</SelectItem>
                    <SelectItem value='2-10'>2-10</SelectItem>
                    <SelectItem value='11-50'>11-50</SelectItem>
                    <SelectItem value='51-200'>51-200</SelectItem>
                    <SelectItem value='201-500'>201-500</SelectItem>
                    <SelectItem value='500+'>500+</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <div className='space-x-3'>
            <Button
              type='submit'
              variant='default'
              size='sm'
              aria-disabled={!canSubmit}
              onClick={(e) => {
                if (!canSubmit) e.preventDefault()
              }}
              className='aria-disabled:opacity-50 aria-disabled:pointer-events-none'
            >
              Criar workspace
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => back()}
              disabled={isPending}
            >
              Voltar
            </Button>
          </div>
        </FieldSet>
      </form>
      <div className='h-full ml-auto self-start py-10'>
        <Muted className='text-xs text-primary'>{user?.user.email}</Muted>
      </div>
    </div>
  )
}
