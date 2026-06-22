'use client'

import {
  BoxIcon,
  Layers01Icon,
  PenTool03Icon,
  RepeatIcon,
  Rocket01Icon,
  SourceCodeSquareIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useActionState, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { type RoleSetupState, saveRoleSetup } from './actions'

const ROLES = [
  { value: 'PRODUCT_MANAGER', label: 'Product Manager', icon: BoxIcon },
  {
    value: 'ENGINEERING_MANAGER',
    label: 'Engineering Manager',
    icon: Layers01Icon,
  },
  { value: 'DESIGNER', label: 'Designer', icon: PenTool03Icon },
  { value: 'DEVELOPER', label: 'Developer', icon: SourceCodeSquareIcon },
  {
    value: 'FOUNDER_EXECUTIBE',
    label: 'Fundador / Executivo',
    icon: Rocket01Icon,
  },
  {
    value: 'OPERATIONS_MANAGER',
    label: 'Operations Manager',
    icon: RepeatIcon,
  },
  { value: 'OTHER', label: 'Outro', icon: BoxIcon },
]

const INITIAL_STATE: RoleSetupState = { ok: false }

export function RoleForm() {
  const [selected, setSelected] = useState<string | null>(null)
  const [state, formAction, isPending] = useActionState(
    saveRoleSetup,
    INITIAL_STATE,
  )

  return (
    <form action={formAction} className='flex flex-col gap-4'>
      <p className='text-sm text-mutedtext-muted-foreground'>
        Selecione uma opção
      </p>

      <div className='flex flex-col gap-3'>
        {ROLES.map((role) => (
          <Button
            key={role.value}
            type='button'
            variant='outline'
            size='lg'
            onClick={() => setSelected(role.value)}
            disabled={isPending}
            className={cn(
              'justify-between rounded-lg border-2 px-3! py-2! text-left text-sm font-medium transition-colors',
              selected === role.value
                ? 'border-primary! bg-primary/5! text-primary!'
                : 'border-border! hover:border-muted-foreground/50!',
            )}
          >
            <div className='flex items-center gap-1.5'>
              <NexoIcon icon={role.icon} strokeWidth={2} />
              {role.label}
            </div>
            <Checkbox
              checked={selected === role.value}
              className={cn(selected === role.value ? 'block' : 'hidden')}
            />
          </Button>
        ))}
      </div>

      <input type='hidden' name='role' value={selected ?? ''} />

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
          disabled={!selected || isPending}
        >
          {isPending ? 'Salvando' : 'Continuar'}
        </Button>
        <Button
          type='submit'
          name='intent'
          value='skip'
          variant='ghost'
          className='w-full'
          disabled={isPending}
        >
          Pular esta etapa
        </Button>
      </div>
    </form>
  )
}
