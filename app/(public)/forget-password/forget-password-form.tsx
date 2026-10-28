'use client'

import Link from 'next/link'
import { useState } from 'react'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { authClient } from '@/src/lib/auth-client'
import { AuthLayout, AuthLayoutHeading } from '../_components/auth-layout'

export function ForgetPasswordForm() {
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string)?.trim()

    if (!email) {
      setFieldError('E-mail é obrigatório')
      return
    }

    const promise = authClient
      .requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      })
      .then(({ error }) => {
        if (error) throw error
      })

    setIsPending(true)
    try {
      const ok = await notify.run(promise, {
        loading: 'Enviando e-mail...',
        success: 'E-mail enviado',
        error: 'Não foi possível enviar o e-mail de redefinição',
      })
      if (ok) setSent(true)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthLayout switchHref='/sign-up' switchLabel='Cadastre-se'>
      {sent ? (
        <div className='space-y-3'>
          <H4>Verifique seu e-mail.</H4>
          <Muted className='text-sm'>
            Se houver uma conta associada a esse endereço, enviamos um link para
            redefinir a senha. Ele é válido pelos próximos 30 minutos.
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
          <AuthLayoutHeading
            title='Esqueceu sua senha?'
            subtitle='Enviaremos um link para redefini-la.'
          />

          <form onSubmit={handleSubmit} className='w-full space-y-4'>
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
              Enviar link de redefinição
            </Button>

            <div className='text-center text-sm'>
              <Muted>
                Lembrou a senha?{' '}
                <Link href='/sign-in' className='text-primary hover:underline'>
                  Entre
                </Link>
              </Muted>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
