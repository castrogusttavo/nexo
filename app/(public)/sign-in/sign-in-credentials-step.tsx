import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthLayoutHeading, AuthLayoutSocial } from '../_components/auth-layout'

export type SignInFieldErrors = { email?: string; password?: string }

// The first sign-in step: social providers, then e-mail and password. The
// form owns no state; SignInForm decides what a submit does.
export function SignInCredentialsStep({
  redirectTo,
  error,
  fieldErrors,
  isPending,
  isRetrying,
  handleSubmit,
}: {
  redirectTo: string
  error: string | null
  fieldErrors: SignInFieldErrors
  isPending: boolean
  /** Shown while a rate-limited request is retried. */
  isRetrying: boolean
  handleSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void
}) {
  return (
    <>
      <AuthLayoutHeading
        title='Trabalhe em todas as dimensões.'
        subtitle='Bem-vindo de volta ao Nexo.'
      />

      <AuthLayoutSocial isPending={isPending} callbackURL={redirectTo} />

      <form onSubmit={handleSubmit} className='w-full space-y-4'>
        {error && (
          <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}
        <Field data-invalid={!!fieldErrors.email || undefined}>
          <FieldLabel htmlFor='sign-in-email'>E-mail</FieldLabel>
          <Input
            id='sign-in-email'
            name='email'
            type='email'
            placeholder='nome@empresa.com'
            disabled={isPending}
          />
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!fieldErrors.password || undefined}>
          <FieldLabel htmlFor='sign-in-password'>Senha</FieldLabel>
          <Input
            id='sign-in-password'
            name='password'
            type='password'
            placeholder='••••••'
            disabled={isPending}
          />
          {fieldErrors.password && (
            <FieldError>{fieldErrors.password}</FieldError>
          )}
        </Field>

        <Button type='submit' className='w-full' disabled={isPending}>
          {isRetrying
            ? 'Muitos acessos agora, tentando de novo...'
            : isPending
              ? 'Entrando...'
              : 'Continuar'}
        </Button>

        <div className='flex items-center justify-center'>
          <Muted className='text-center text-sm p-4'>
            Esqueceu sua senha?{' '}
            <Link
              href='/forget-password'
              className='text-primary hover:underline'
            >
              Redefinir senha
            </Link>
            .
          </Muted>
        </div>
      </form>
    </>
  )
}
