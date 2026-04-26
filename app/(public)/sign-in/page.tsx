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

export default function SignIn() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
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
    const submittedEmail = formData.get('email') as string
    const password = formData.get('password') as string

    const errors: { email?: string; password?: string } = {}
    if (!submittedEmail) errors.email = 'E-mail é obrigatório'
    if (!password) errors.password = 'Senha é obrigatória'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setIsPending(false)
      return
    }

    const { data, error: signInError } = await authClient.signIn.email({
      email: submittedEmail,
      password,
    })

    if (signInError) {
      setError(signInError.message ?? 'E-mail ou senha inválidos')
      setIsPending(false)
      return
    }

    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      setEmail(submittedEmail)
      setStep('otp')
      setIsPending(false)
      const { error: sendError } = await authClient.twoFactor.sendOtp()
      if (sendError) {
        setOtpError(
          sendError.message ?? 'Não foi possível enviar o código de acesso',
        )
      }
      return
    }

    router.push('/')
  }

  async function handleVerify(otp: string) {
    setOtpError(null)
    setIsVerifying(true)
    const { error: verifyError } = await authClient.twoFactor.verifyOtp({
      code: otp,
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
    const { error: resendError } = await authClient.twoFactor.sendOtp()
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
      <HeaderLogin path='sign-up' pathname='Cadastre-se' />
      <div className='flex-1 w-full flex flex-col justify-center space-y-6 max-w-90'>
        {step === 'form' ? (
          <>
            <div>
              <H4>Trabalhe em todas as dimensões.</H4>
              <H4 className='text-muted-foreground'>Bem-vindo de volta ao Nexo.</H4>
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
                <span className='bg-background px-2 text-muted-foreground'>ou</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='w-full space-y-4'>
              {error && (
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {error}
                </div>
              )}
              <Field data-invalid={!!fieldErrors.email || undefined}>
                <FieldLabel>E-mail</FieldLabel>
                <Input
                  name='email'
                  type='email'
                  placeholder='nome@empresa.com'
                  disabled={isPending}
                />
                {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
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
                {isPending ? 'Entrando...' : 'Continuar'}
              </Button>

              <div className='flex items-center justify-center'>
                <Muted className='text-center text-sm p-4'>
                  Esqueceu sua senha? {' '}
                  <Link href='#' className='text-primary hover:underline'>
                    Redefinir senha
                  </Link>.
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
