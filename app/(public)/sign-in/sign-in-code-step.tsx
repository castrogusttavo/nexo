import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthLayoutHeading } from '../_components/auth-layout'

// A second-factor step that takes a typed code: the authenticator app's
// six digits or a saved backup code. Both offer the e-mail code instead.
export function SignInCodeStep({
  id,
  title,
  subtitle,
  label,
  placeholder,
  numeric = false,
  value,
  onChange,
  error,
  pending,
  trustDevice,
  onSubmit,
  onUseEmail,
}: {
  id: string
  title: string
  subtitle: string
  label: string
  placeholder: string
  /** A one-time code from an app: numeric keypad and autofill. */
  numeric?: boolean
  value: string
  onChange: (value: string) => void
  error: string | null
  pending: boolean
  /** The "trust this device" checkbox, shared with the e-mail step. */
  trustDevice: ReactNode
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void
  onUseEmail: () => void
}) {
  return (
    <>
      <AuthLayoutHeading title={title} subtitle={subtitle} />
      <form onSubmit={onSubmit} className='w-full space-y-4'>
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            {...(numeric && {
              inputMode: 'numeric' as const,
              autoComplete: 'one-time-code',
            })}
            autoFocus
            disabled={pending}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        {trustDevice}
        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? 'Verificando...' : 'Verificar código'}
        </Button>
        <div className='text-center text-sm'>
          <button
            type='button'
            onClick={onUseEmail}
            className='text-primary hover:underline'
          >
            Usar o código enviado por e-mail
          </button>
        </div>
      </form>
    </>
  )
}
