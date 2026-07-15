'use client'

import { CheckmarkCircle02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useActionState, useEffect, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { createOnboardingWorkspace, type WorkspaceSetupState } from './actions'

const TEAM_SIZES = [
  { value: '1', label: 'Apenas eu' },
  { value: '2-10', label: '2-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
]

const INITIAL_STATE: WorkspaceSetupState = { ok: false }

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export function WorkspaceForm() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [teamSize, setTeamSize] = useState<string | null>(null)
  const [state, formAction, isPending] = useActionState(
    createOnboardingWorkspace,
    INITIAL_STATE,
  )

  useEffect(() => {
    if (!slugTouched) setSlug(toSlug(name))
  }, [name, slugTouched])

  const isValid = name.trim().length >= 2 && slug.length >= 2

  return (
    <form action={formAction} className='flex flex-col gap-10'>
      <FieldSet>
        <FieldGroup className='flex flex-col gap-4'>
          <Field>
            <FieldLabel htmlFor='name'>
              Nome do seu workspace <span className='text-destructive'>*</span>
            </FieldLabel>
            <Input
              id='name'
              name='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Algo familiar e reconhecível é sempre melhor.'
              disabled={isPending}
              autoFocus
            />
          </Field>

          <Field>
            <FieldLabel htmlFor='workspace-slug'>
              Defina o URL do seu workspace{' '}
              <span className='text-destructive'>*</span>
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>nexo.coodee.dev/</InputGroupText>
                <InputGroupInput
                  id='workspace-slug'
                  name='slug'
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(toSlug(e.target.value))
                  }}
                  placeholder='Digite ou cole um URL'
                  disabled={isPending}
                  className='text-foreground'
                />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field className='w-full'>
            <FieldLabel htmlFor='workspace-size'>
              Quantas pessoas usarão este espaço de trabalho?
            </FieldLabel>
            <FieldContent className='w-full flex flex-row flex-wrap gap-3'>
              {TEAM_SIZES.map((size) => (
                <Button
                  key={size.value}
                  type='button'
                  variant={teamSize === size.value ? 'secondary' : 'outline'}
                  onClick={() => setTeamSize(size.value)}
                  className='w-fit'
                >
                  <NexoIcon icon={CheckmarkCircle02Icon} />
                  {size.label}
                </Button>
              ))}
            </FieldContent>
          </Field>
        </FieldGroup>
        <input type='hidden' name='teamSize' value={teamSize ?? ''} />

        {state.error && <FieldError>{state.error}</FieldError>}

        <div className='pt-6'>
          <Button
            type='submit'
            className='w-full'
            disabled={!isValid || isPending}
          >
            {isPending ? 'Criando...' : 'Criar workspace'}
          </Button>
        </div>
      </FieldSet>
    </form>
  )
}
