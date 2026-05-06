'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmailValidationWithOtp } from '@/components/form/email-validation-with-otp'
import { GitHubLoginButton } from '@/components/github-login-button'
import { GoogleLoginButton } from '@/components/google-login-button'
import { HeaderLogin } from '@/components/header-login'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/src/lib/auth-client'

type Step = 'form' | 'otp'

export function SignUpForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})
  const [isPending, setIsPending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const submittedEmail = formData.get('email') as string
    const password = formData.get('password') as string

    const errors: { name?: string; email?: string; password?: string } = {}
    if (!name || name.length < 2)
      errors.name = 'Nome deve ter ao menos 2 caracteres'
    if (!submittedEmail) errors.email = 'E-mail é obrigatório'
    if (!password || password.length < 6)
      errors.password = 'Senha deve ter ao menos 6 caracteres'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setIsPending(false)
      return
    }

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email: submittedEmail,
      password,
    })

    if (signUpError) {
      setError(signUpError.message ?? 'Erro ao criar conta')
      setIsPending(false)
      return
    }

    setEmail(submittedEmail)
    setStep('otp')
    setIsPending(false)
  }

  async function handleVerify(otp: string) {
    setOtpError(null)
    setIsVerifying(true)
    const { error: verifyError } = await authClient.emailOtp.verifyEmail({
      email,
      otp,
    })
    setIsVerifying(false)

    if (verifyError) {
      setOtpError(verifyError.message ?? 'Código inválido ou expirado')
      return
    }

    router.push('/')
  }

  async function handleResend() {
    setOtpError(null)
    const { error: resendError } =
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
    if (resendError) {
      setOtpError(resendError.message ?? 'Não foi possível reenviar o código')
    }
  }

  function handleBack() {
    setStep('form')
    setOtpError(null)
  }

  return (
    <div className='min-h-screen flex flex-col items-center justiyf-center p-4 pb-12'>
      <HeaderLogin path='sign-in' pathname='Entre' />
      <div className='flex-1 w-full flex flex-col justify-center space-y-6 max-w-90'>
        {step === 'form' ? (
          <>
            <div>
              <H4>Trabalhe em todas as dimensões.</H4>
              <H4 className='text-muted-foreground'>Crie sua conta do Nexo.</H4>
            </div>

            <div className='flex flex-col gap-3'>
              <GoogleLoginButton isPending={isPending} />
              <GitHubLoginButton isPending={isPending} />
            </div>

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-background px-2 text-muted-foreground'>
                  ou
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='w-full space-y-4'>
              {error && (
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {error}
                </div>
              )}
              <Field data-invalid={!!fieldErrors.name || undefined}>
                <FieldLabel>Nome</FieldLabel>
                <Input
                  name='name'
                  type='text'
                  placeholder='Seu nome'
                  disabled={isPending}
                />
                {fieldErrors.name && (
                  <FieldError>{fieldErrors.name}</FieldError>
                )}
              </Field>
              <Field data-invalid={!!fieldErrors.email || undefined}>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  name='email'
                  type='email'
                  placeholder='nome@empresa.com'
                  disabled={isPending}
                />
                {fieldErrors.email && (
                  <FieldError>{fieldErrors.email}</FieldError>
                )}
              </Field>
              <Field data-invalid={!!fieldErrors.password || undefined}>
                <FieldLabel>Senha</FieldLabel>
                <Input
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
                {isPending ? 'Criando conta...' : 'Criar conta'}
              </Button>

              <div className='text-center text-sm'>
                <Muted>
                  Já tem conta?{' '}
                  <Link
                    href='/sign-in'
                    className='text-primary hover:underline'
                  >
                    Entre
                  </Link>
                </Muted>
              </div>

              <div className='flex items-center justify-center'>
                <Muted className='text-center text-sm p-4'>
                  Ao criar sua conta, você concorda com nossos{' '}
                  <Link
                    href='/service-term'
                    className='text-primary hover:underline'
                  >
                    Termos de Serviço
                  </Link>{' '}
                  e{' '}
                  <Link
                    href='/privacy-policy'
                    className='text-primary hover:underline'
                  >
                    Política de Privacidade
                  </Link>{' '}
                  .
                </Muted>
              </div>
            </form>
          </>
        ) : (
          <EmailValidationWithOtp
            email={email}
            onBack={handleBack}
            onVerify={handleVerify}
            onResend={handleResend}
            isPending={isVerifying}
            error={otpError}
          />
        )}
      </div>
      <div>
        <Muted>Junte-se a mais de 1.000 times no Nexo</Muted>
      </div>
    </div>
  )
}
