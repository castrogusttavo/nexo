'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReducer, useState } from 'react'
import { EmailValidationWithOtp } from '@/components/form/email-validation-with-otp'
import { HeaderLogin } from '@/components/header-login'
import { SocialLoginButtonProps } from '@/components/social-login-button'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/src/lib/auth-client'

type Step = 'form' | 'otp'

type FieldErrors = {
  name?: string
  email?: string
  password?: string
  consent?: string
}

interface SignUpState {
  step: Step
  email: string
  error: string | null
  otpError: string | null
  fieldErrors: FieldErrors
  isPending: boolean
  isVerifying: boolean
}

type SignUpAction =
  | { type: 'submitStart' }
  | { type: 'submitValidationError'; errors: FieldErrors }
  | { type: 'submitError'; message: string }
  | { type: 'submitSuccess'; email: string }
  | { type: 'verifyStart' }
  | { type: 'verifySettled'; error: string | null }
  | { type: 'resendStart' }
  | { type: 'resendError'; message: string }
  | { type: 'back' }
  | { type: 'consentErrorCleared' }

const initialSignUpState: SignUpState = {
  step: 'form',
  email: '',
  error: null,
  otpError: null,
  fieldErrors: {},
  isPending: false,
  isVerifying: false,
}

function signUpReducer(state: SignUpState, action: SignUpAction): SignUpState {
  switch (action.type) {
    case 'submitStart':
      return { ...state, error: null, fieldErrors: {}, isPending: true }
    case 'submitValidationError':
      return { ...state, fieldErrors: action.errors, isPending: false }
    case 'submitError':
      return { ...state, error: action.message, isPending: false }
    case 'submitSuccess':
      return { ...state, email: action.email, step: 'otp', isPending: false }
    case 'verifyStart':
      return { ...state, otpError: null, isVerifying: true }
    case 'verifySettled':
      return { ...state, otpError: action.error, isVerifying: false }
    case 'resendStart':
      return { ...state, otpError: null }
    case 'resendError':
      return { ...state, otpError: action.message }
    case 'back':
      return { ...state, step: 'form', otpError: null }
    case 'consentErrorCleared':
      return {
        ...state,
        fieldErrors: { ...state.fieldErrors, consent: undefined },
      }
  }
}

export function SignUpForm({ redirectTo = '/' }: { redirectTo?: string }) {
  const { push } = useRouter()
  const [formState, dispatch] = useReducer(signUpReducer, initialSignUpState)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const { step, email, error, otpError, fieldErrors, isPending, isVerifying } =
    formState

  const signInHref =
    redirectTo === '/'
      ? '/sign-in'
      : `/sign-in?redirect=${encodeURIComponent(redirectTo)}`

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    dispatch({ type: 'submitStart' })

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const submittedEmail = formData.get('email') as string
    const password = formData.get('password') as string

    const errors: FieldErrors = {}
    if (!name || name.length < 2)
      errors.name = 'Nome deve ter ao menos 2 caracteres'
    if (!submittedEmail) errors.email = 'E-mail é obrigatório'
    if (!password || password.length < 8)
      errors.password = 'Senha deve ter ao menos 8 caracteres'
    if (!acceptedTerms || !acceptedPrivacy)
      errors.consent =
        'Você precisa aceitar os Termos de Serviço e a Política de Privacidade'

    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'submitValidationError', errors })
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
      dispatch({
        type: 'submitError',
        message: signUpError.message ?? 'Erro ao criar conta',
      })
      return
    }

    dispatch({ type: 'submitSuccess', email: submittedEmail })
  }

  async function handleVerify(otp: string) {
    dispatch({ type: 'verifyStart' })
    const { error: verifyError } = await authClient.emailOtp.verifyEmail({
      email,
      otp,
    })

    if (verifyError) {
      dispatch({
        type: 'verifySettled',
        error: verifyError.message ?? 'Código inválido ou expirado',
      })
      return
    }

    dispatch({ type: 'verifySettled', error: null })
    push(redirectTo)
  }

  async function handleResend() {
    dispatch({ type: 'resendStart' })
    const { error: resendError } =
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
    if (resendError) {
      dispatch({
        type: 'resendError',
        message: resendError.message ?? 'Não foi possível reenviar o código',
      })
    }
  }

  function handleBack() {
    dispatch({ type: 'back' })
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
              <SocialLoginButtonProps
                provider='google'
                isPending={isPending}
                callbackURL={redirectTo}
              />
              <SocialLoginButtonProps
                provider='github'
                isPending={isPending}
                callbackURL={redirectTo}
              />
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
                    onCheckedChange={(checked) => {
                      setAcceptedTerms(checked === true)
                      if (checked === true && fieldErrors.consent) {
                        dispatch({ type: 'consentErrorCleared' })
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
                    onCheckedChange={(checked) => {
                      setAcceptedPrivacy(checked === true)
                      if (checked === true && fieldErrors.consent) {
                        dispatch({ type: 'consentErrorCleared' })
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
                    href={signInHref}
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
