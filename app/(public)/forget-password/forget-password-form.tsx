'use client'

import Link from 'next/link'
import { useState } from 'react'
import { HeaderLogin } from '@/components/header-login'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/src/lib/auth-client'

export function ForgetPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldError(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string)?.trim()

    if (!email) {
      setFieldError('E-mail é obrigatório')
      return
    }

    setIsPending(true)
    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      })

      if (requestError) {
        setError(
          requestError.message ??
            'Não foi possível enviar o e-mail de redefinição',
        )
        return
      }

      // Neutral confirmation: never reveal whether the address has an account.
      setSent(true)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 pb-12'>
      <HeaderLogin path='sign-up' pathname='Cadastre-se' />
      <div className='flex-1 w-full flex flex-col justify-center gap-y-6 max-w-90'>
        {sent ? (
          <div className='space-y-3'>
            <H4>Verifique seu e-mail.</H4>
            <Muted className='text-sm'>
              Se houver uma conta associada a esse endereço, enviamos um link
              para redefinir a senha. Ele é válido pelos próximos 30 minutos.
            </Muted>
            <Link
              href='/sign-in'
              className={buttonVariants({
                variant: 'outline',
                className: 'w-full',
              })}
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div>
              <H4>Esqueceu sua senha?</H4>
              <H4 className='text-muted-foreground'>
                Enviaremos um link para redefini-la.
              </H4>
            </div>

            <form onSubmit={handleSubmit} className='w-full space-y-4'>
              {error && (
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {error}
                </div>
              )}
              <Field data-invalid={!!fieldError || undefined}>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  name='email'
                  type='email'
                  placeholder='nome@empresa.com'
                  disabled={isPending}
                />
                {fieldError && <FieldError>{fieldError}</FieldError>}
              </Field>

              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending ? 'Enviando...' : 'Enviar link de redefinição'}
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
