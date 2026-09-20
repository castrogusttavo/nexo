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
import type { CreateWorkspaceDTO } from '@/src/schemas/workspace.schema'

// The buckets the API accepts (`CreateWorkspaceSchema.teamSize`); the labels
// stay here, next to the only screen that shows them.
type TeamSize = NonNullable<CreateWorkspaceDTO['teamSize']>

const TEAM_SIZES: { value: TeamSize; label: string }[] = [
  { value: '1', label: 'Apenas eu' },
  { value: '2-10', label: '2-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
]

// Keeps a trailing hyphen so a space typed in the URL field survives until
// the next letter (trimming on every keystroke swallowed it); `toSlug`
// drops the dangling hyphens for the value that is actually submitted.
function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .slice(0, 50)
}

function toSlug(value: string) {
  return slugify(value).replace(/-+$/, '')
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
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    slug?: string
  }>({})

  const isPending = createWorkspace.isPending
  // What the URL field shows while typing keeps its dangling hyphen; what
  // leaves the form never does.
  const submittedSlug = toSlug(slug)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setName(value)
    if (!slugTouchedRef.current) setSlug(toSlug(value))
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
    if (submittedSlug.length < 2)
      errors.slug = 'Slug deve ter ao menos 2 caracteres'
    if (!/^[a-z0-9-]+$/.test(submittedSlug))
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
          slug: submittedSlug,
          ...(teamSize && { teamSize }),
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
          src='/brand/logo.svg'
          alt='nexo-logo'
          width={142}
          height={40}
          className='relative z-10 py-10 invert dark:invert-0'
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
                  <InputGroupText>nexopm.com/</InputGroupText>
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
              <Select
                value={teamSize ?? ''}
                onValueChange={(value) => setTeamSize(value as TeamSize)}
              >
                <SelectTrigger id='workspace-size' disabled={isPending}>
                  <SelectValue placeholder='Selecione um intervalo' />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className='w-full'>
                  <SelectGroup>
                    {TEAM_SIZES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
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
              disabled={isPending}
            >
              {isPending ? 'Criando...' : 'Criar workspace'}
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
