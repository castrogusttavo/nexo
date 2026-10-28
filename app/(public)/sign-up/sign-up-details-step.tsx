import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthLayoutHeading, AuthLayoutSocial } from '../_components/auth-layout'

export type SignUpFieldErrors = {
  name?: string
  email?: string
  password?: string
  consent?: string
}

// The first sign-up step: social providers, then name, e-mail, password and
// the two consents. The form owns no state; SignUpForm decides what a submit
// does.
export function SignUpDetailsStep({
  redirectTo,
  signInHref,
  error,
  fieldErrors,
  isPending,
  acceptedTerms,
  acceptedPrivacy,
  onTermsChange,
  onPrivacyChange,
  handleSubmit,
}: {
  redirectTo: string
  signInHref: string
  error: string | null
  fieldErrors: SignUpFieldErrors
  isPending: boolean
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  onTermsChange: (accepted: boolean) => void
  onPrivacyChange: (accepted: boolean) => void
  handleSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void
}) {
  return (
    <>
      <AuthLayoutHeading
        title='Trabalhe em todas as dimensões.'
        subtitle='Crie sua conta do Nexo.'
      />

      <AuthLayoutSocial isPending={isPending} callbackURL={redirectTo} />

      <form onSubmit={handleSubmit} className='w-full space-y-4'>
        {error && (
          <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}
        <Field data-invalid={!!fieldErrors.name || undefined}>
          <FieldLabel htmlFor='sign-up-name'>Nome</FieldLabel>
          <Input
            id='sign-up-name'
            name='name'
            type='text'
            placeholder='Seu nome'
            disabled={isPending}
          />
          {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
        </Field>
        <Field data-invalid={!!fieldErrors.email || undefined}>
          <FieldLabel htmlFor='sign-up-email'>E-mail</FieldLabel>
          <Input
            id='sign-up-email'
            name='email'
            type='email'
            placeholder='nome@empresa.com'
            disabled={isPending}
          />
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!fieldErrors.password || undefined}>
          <FieldLabel htmlFor='sign-up-password'>Senha</FieldLabel>
          <Input
            id='sign-up-password'
            name='password'
            type='password'
            placeholder='••••••'
            disabled={isPending}
          />
          {fieldErrors.password && (
            <FieldError>{fieldErrors.password}</FieldError>
          )}
        </Field>

        <div className='flex flex-col gap-2'>
          <div className='flex items-start gap-2'>
            <Checkbox
              id='accept-terms'
              checked={acceptedTerms}
              onCheckedChange={(checked) => onTermsChange(checked === true)}
              disabled={isPending}
              aria-invalid={!!fieldErrors.consent || undefined}
              className='mt-0.5'
            />
            <label
              htmlFor='accept-terms'
              className='text-sm leading-5 text-muted-foreground'
            >
              Li e aceito os{' '}
              <Link
                href='/legals/terms-and-conditions'
                className='text-primary hover:underline'
                target='_blank'
                rel='noopener noreferrer'
              >
                Termos de Serviço
              </Link>
            </label>
          </div>
          <div className='flex items-start gap-2'>
            <Checkbox
              id='accept-privacy'
              checked={acceptedPrivacy}
              onCheckedChange={(checked) => onPrivacyChange(checked === true)}
              disabled={isPending}
              aria-invalid={!!fieldErrors.consent || undefined}
              className='mt-0.5'
            />
            <label
              htmlFor='accept-privacy'
              className='text-sm leading-5 text-muted-foreground'
            >
              Li e aceito a{' '}
              <Link
                href='/legals/privacy-policy'
                className='text-primary hover:underline'
                target='_blank'
                rel='noopener noreferrer'
              >
                Política de Privacidade
              </Link>
            </label>
          </div>
          {fieldErrors.consent && (
            <p className='text-sm text-destructive'>{fieldErrors.consent}</p>
          )}
        </div>

        <Button type='submit' className='w-full' disabled={isPending}>
          {isPending ? 'Criando conta...' : 'Criar conta'}
        </Button>

        <div className='text-center text-sm'>
          <Muted>
            Já tem conta?{' '}
            <Link href={signInHref} className='text-primary hover:underline'>
              Entre
            </Link>
          </Muted>
        </div>
      </form>
    </>
  )
}
