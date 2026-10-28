'use client'

import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type {
  TwoFactorPasswordAction,
  TwoFactorPasswordState,
} from './use-two-factor-password'

const LABEL: Record<TwoFactorPasswordAction, string> = {
  enable: 'Senha para ativar a 2FA',
  disable: 'Senha para desativar a 2FA',
  regenerate: 'Senha para gerar novos códigos de backup',
}

const SUBMIT: Record<TwoFactorPasswordAction, string> = {
  enable: 'Ativar 2FA',
  disable: 'Desativar 2FA',
  regenerate: 'Gerar códigos',
}

// The password prompt of useTwoFactorPassword. Not a <form>: it also sits
// inside the onboarding profile form, so Enter confirms by hand instead of
// submitting the outer form.
export function TwoFactorPasswordForm({
  state,
}: {
  state: TwoFactorPasswordState
}) {
  const id = useId()
  const { action, password, setPassword, error, busy, cancel, confirm } = state
  if (!action) return null

  return (
    <div className='flex flex-col gap-3 border-t border-border pt-4'>
      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor={id}>{LABEL[action]}</FieldLabel>
        <Input
          id={id}
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            confirm()
          }}
          placeholder='••••••'
          disabled={busy}
          autoFocus
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <div className='flex gap-2 justify-end'>
        <Button type='button' variant='ghost' onClick={cancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type='button' onClick={confirm} disabled={busy}>
          {busy ? 'Processando...' : SUBMIT[action]}
        </Button>
      </div>
    </div>
  )
}
