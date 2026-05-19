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
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/src/lib/auth-client'

type Step = 'form' | 'otp'

export function SignUpForm() {
  const { push } = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
    consent?: string
  }>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
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

    const errors: {
      name?: string
      email?: string
      password?: string
      consent?: string
    } = {}
    if (!name || name.length < 2)
      errors.name = 'Nome deve ter ao menos 2 caracteres'
    if (!submittedEmail) errors.email = 'E-mail é obrigatório'
    if (!password || password.length < 6)
      errors.password = 'Senha deve ter ao menos 6 caracteres'
    if (!acceptedTerms || !acceptedPrivacy)
      errors.consent =
        'Você precisa aceitar os Termos de Serviço e a Política de Privacidade'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setIsPending(false)
      return
    }

    // Send a client-side timestamp so the request typechecks; the
    // server hook in `auth.ts` overwrites both with `new Date()` to
    // prevent a tampered client from backdating its acceptance.
    const now = new Date()
    const { error: signUpError } = await authClient.signUp.email({
      name,
      email: submittedEmail,
      password,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
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

    push('/')
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
      <div className='flex-1 w-full flex flex-col justify-center gap-y-6 max-w-90'>
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

              <div className='flex flex-col gap-2'>
                <div className='flex items-start gap-2'>
                  <Checkbox
                    id='accept-terms'
                    checked={acceptedTerms}
                    onCheckedChange={(state) => {
                      setAcceptedTerms(state === true)
                      if (state === true && fieldErrors.consent) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          consent: undefined,
                        }))
                      }
                    }}
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
                      href='/legals/terms'
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
                    onCheckedChange={(state) => {
                      setAcceptedPrivacy(state === true)
                      if (state === true && fieldErrors.consent) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          consent: undefined,
                        }))
                      }
                    }}
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
                      href='/legals/privacy'
                      className='text-primary hover:underline'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      Política de Privacidade
                    </Link>
                  </label>
                </div>
                {fieldErrors.consent && (
                  <p className='text-sm text-destructive'>
                    {fieldErrors.consent}
                  </p>
                )}
              </div>

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
