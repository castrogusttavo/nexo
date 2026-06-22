'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { type GoalsSetupState, saveGoalsSetup } from './actions'

const BRINGS = [
  { value: 'ROADMAP', label: 'Planejar e acompanhar roadmaps de produto' },
  { value: 'SPRINTS', label: 'Gerenciar sprints de engenharia' },
  { value: 'CROSS_FUNCTIONAL', label: 'Coordenar projetos entre times' },
  { value: 'REPLACE_TOOL', label: 'Substituir nossa ferramentas atual' },
  { value: 'EXPLORING', label: 'Só estou explorando' },
]

const INITIAL_STATE: GoalsSetupState = { ok: false }

export function GoalsForm() {
  const [count, setCount] = useState(0)
  const [state, formAction, isPending] = useActionState(
    saveGoalsSetup,
    INITIAL_STATE,
  )

  function handleChange(checked: boolean) {
    setCount((prev) => prev + (checked ? 1 : -1))
  }

  return (
    <form action={formAction} className='flex flex-col gap-4'>
      <p className='text-sm text-mutedtext-muted-foreground'>
        Selecione uma ou várias opções
      </p>

      <FieldGroup className='gap-3'>
        {BRINGS.map((item) => (
          <Field
            key={item.value}
            orientation='horizontal'
            className={cn(
              'justify-between rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
              'border-border hover:border-muted-foreground/50',
              'has-[data-checked]:border-primary has-[data-checked]:bg-primary/5 has-[data-checked]:text-primary',
            )}
          >
            <Checkbox
              id={`goal-${item.value}`}
              name='goals'
              value={item.value}
              disabled={isPending}
              onCheckedChange={(checked) => handleChange(checked === true)}
            />
            <FieldLabel>{item.label}</FieldLabel>
          </Field>
        ))}
      </FieldGroup>

      {state.error && (
        <p className='text-sm text-destructive' role='alert'>
          {state.error}
        </p>
      )}

      <div className='flex flex-col gap-2 pt-10'>
        <Button
          type='submit'
          name='intent'
          value='continue'
          className='w-full'
          disabled={count === 0 || isPending}
        >
          {isPending ? 'Salvando...' : 'Continuar'}
        </Button>
        <Button
          type='submit'
          name='intent'
          value='skip'
          variant='ghost'
          className='w-full text-muted-foreground'
          disabled={isPending}
        >
          Pular esta etapa
        </Button>
      </div>
    </form>
  )
}
