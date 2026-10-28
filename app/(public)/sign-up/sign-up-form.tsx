'use client'

import { useRouter } from 'next/navigation'
import { useReducer, useState } from 'react'
import { EmailValidationWithOtp } from '@/components/security/email-validation-with-otp'
import { captureEvent } from '@/lib/posthog/client'
import { authClient } from '@/src/lib/auth-client'
import { authErrorMessage } from '@/src/lib/auth-errors'
import { settleAuthRequest } from '@/src/lib/auth-request'
import { SIGNED_IN_HOME } from '@/src/lib/safe-redirect'
import { AuthLayout } from '../_components/auth-layout'
import {
  SignUpDetailsStep,
  type SignUpFieldErrors,
} from './sign-up-details-step'

type Step = 'form' | 'otp'

interface SignUpState {
  step: Step
  email: string
  error: string | null
  otpError: string | null
  fieldErrors: SignUpFieldErrors
  isPending: boolean
  isVerifying: boolean
}

type SignUpAction =
  | { type: 'submitStart' }
  | { type: 'submitValidationError'; errors: SignUpFieldErrors }
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

export function SignUpForm({
  redirectTo = SIGNED_IN_HOME,
}: {
  redirectTo?: string
}) {
  const { push } = useRouter()
  const [formState, dispatch] = useReducer(signUpReducer, initialSignUpState)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const { step, email, error, otpError, fieldErrors, isPending, isVerifying } =
    formState

  const signInHref =
    redirectTo === SIGNED_IN_HOME
      ? '/sign-in'
      : `/sign-in?redirect=${encodeURIComponent(redirectTo)}`

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    dispatch({ type: 'submitStart' })

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const submittedEmail = formData.get('email') as string
    const password = formData.get('password') as string

    const errors: SignUpFieldErrors = {}
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

    // Fired after validation, before the request: the gap between this and
    // `signup_completed` is how much the API itself costs us in abandoned
    // signups, which a page view cannot show.
    captureEvent('signup_submitted')

    // Send a client-side timestamp so the request typechecks; the
    // server hook in `auth.ts` overwrites both with `new Date()` to
    // prevent a tampered client from backdating its acceptance.
    const now = new Date()
    const { error: signUpError } = await settleAuthRequest(
      authClient.signUp.email({
        name,
        email: submittedEmail,
        password,
        acceptedTermsAt: now,
        acceptedPrivacyAt: now,
      }),
    )

    if (signUpError) {
      dispatch({
        type: 'submitError',
        message: authErrorMessage(signUpError, 'Erro ao criar conta'),
      })
      return
    }

    captureEvent('signup_completed')
    dispatch({ type: 'submitSuccess', email: submittedEmail })
  }

  async function handleVerify(otp: string) {
    dispatch({ type: 'verifyStart' })
    const { error: verifyError } = await settleAuthRequest(
      authClient.emailOtp.verifyEmail({ email, otp }),
    )

    if (verifyError) {
      dispatch({
        type: 'verifySettled',
        error: authErrorMessage(verifyError, 'Código inválido ou expirado'),
      })
      return
    }

    // Verification is a hard gate: without it there is no session at all, so
    // a drop here is the whole funnel dying quietly.
    captureEvent('email_verified')
    dispatch({ type: 'verifySettled', error: null })
    push(redirectTo)
  }

  async function handleResend() {
    dispatch({ type: 'resendStart' })
    const { error: resendError } = await settleAuthRequest(
      authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      }),
    )
    if (resendError) {
      dispatch({
        type: 'resendError',
        message: authErrorMessage(
          resendError,
          'Não foi possível reenviar o código',
        ),
      })
    }
  }

  function handleBack() {
    dispatch({ type: 'back' })
  }

  return (
    <AuthLayout
      switchHref={signInHref}
      switchLabel='Entre'
      switchPrompt='Já tem conta?'
    >
      {step === 'form' ? (
        <SignUpDetailsStep
          redirectTo={redirectTo}
          signInHref={signInHref}
          error={error}
          fieldErrors={fieldErrors}
          isPending={isPending}
          acceptedTerms={acceptedTerms}
          acceptedPrivacy={acceptedPrivacy}
          onTermsChange={(accepted) => {
            setAcceptedTerms(accepted)
            if (accepted && fieldErrors.consent)
              dispatch({ type: 'consentErrorCleared' })
          }}
          onPrivacyChange={(accepted) => {
            setAcceptedPrivacy(accepted)
            if (accepted && fieldErrors.consent)
              dispatch({ type: 'consentErrorCleared' })
          }}
          handleSubmit={handleSubmit}
        />
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
    </AuthLayout>
  )
}
