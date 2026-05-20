'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { HeaderLogin } from '@/components/header-login'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/src/lib/auth-client'

interface ResetPasswordFormProps {
  token?: string
  linkError?: string
}

export function ResetPasswordForm({
  token,
  linkError,
}: ResetPasswordFormProps) {
  const { push } = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string
    confirm?: string
  }>({})
  const [isPending, setIsPending] = useState(false)

  // The token only reaches this page after better-auth validated it and
  // redirected here; an absent token (or ?error=INVALID_TOKEN) means a
  // broken or expired link, so there's nothing to submit.
  const tokenInvalid = !token || !!linkError

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    const errors: { password?: string; confirm?: string } = {}
    if (!password || password.length < 8)
      errors.password = 'A senha deve ter ao menos 8 caracteres'
    if (confirm !== password) errors.confirm = 'As senhas não coincidem'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsPending(true)
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (resetError) {
        setError(
          resetError.message ??
            'Não foi possível redefinir a senha. O link pode ter expirado.',
        )
        return
      }

      push('/sign-in')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 pb-12'>
      <HeaderLogin path='sign-up' pathname='Cadastre-se' />
      <div className='flex-1 w-full flex flex-col justify-center gap-y-6 max-w-90'>
        {tokenInvalid ? (
          <div className='space-y-3'>
            <H4>Link inválido ou expirado.</H4>
            <Muted className='text-sm'>
              Este link de redefinição não é mais válido. Solicite um novo para
              continuar.
            </Muted>
            <Link
              href='/forget-password'
              className={buttonVariants({ className: 'w-full' })}
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <>
            <div>
              <H4>Defina uma nova senha.</H4>
              <H4 className='text-muted-foreground'>
                Escolha uma senha que você ainda não usou.
              </H4>
            </div>

            <form onSubmit={handleSubmit} className='w-full space-y-4'>
              {error && (
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {error}
                </div>
              )}
              <Field data-invalid={!!fieldErrors.password || undefined}>
                <FieldLabel>Nova senha</FieldLabel>
                <Input
                  name='password'
                  type='password'
                  placeholder='••••••••'
                  disabled={isPending}
                />
                {fieldErrors.password && (
                  <FieldError>{fieldErrors.password}</FieldError>
                )}
              </Field>
              <Field data-invalid={!!fieldErrors.confirm || undefined}>
                <FieldLabel>Confirme a nova senha</FieldLabel>
                <Input
                  name='confirm'
                  type='password'
                  placeholder='••••••••'
                  disabled={isPending}
                />
                {fieldErrors.confirm && (
                  <FieldError>{fieldErrors.confirm}</FieldError>
                )}
              </Field>

              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>

              <div className='text-center text-sm'>
                <Muted>
                  Lembrou a senha?{' '}
                  <Link
                    href='/sign-in'
                    className='text-primary hover:underline'
                  >
                    Entre
                  </Link>
                </Muted>
              </div>
            </form>
          </>
        )}
      </div>
      <div>
        <Muted>Junte-se a mais de 1.000 times no Nexo</Muted>
      </div>
    </div>
  )
}
