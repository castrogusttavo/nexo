'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmailValidationWithOtp } from '@/components/security/email-validation-with-otp'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { authClient } from '@/src/lib/auth-client'
import { authErrorMessage } from '@/src/lib/auth-errors'
import { settleAuthRequest } from '@/src/lib/auth-request'
import { SIGNED_IN_HOME } from '@/src/lib/safe-redirect'
import {
  lastTwoFactorMethod,
  rememberTwoFactorMethod,
} from '@/src/lib/two-factor-method-hint'
import { AuthLayout } from '../_components/auth-layout'
import { SignInCodeStep } from './sign-in-code-step'
import {
  SignInCredentialsStep,
  type SignInFieldErrors,
} from './sign-in-credentials-step'

type Step = 'form' | 'otp' | 'totp' | 'backup'

const MAX_RETRIES = 2

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function SignInForm({
  redirectTo = SIGNED_IN_HOME,
}: {
  redirectTo?: string
}) {
  const { push } = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({})
  const [isPending, setIsPending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [totpCode, setTotpCode] = useState('')
  // Skips the second factor on this browser for 30 days. Platform admins are
  // refused server-side regardless of what this sends (src/lib/auth.ts), so
  // the box can stay on screen for everyone without leaking who is an admin.
  const [trustDevice, setTrustDevice] = useState(false)

  const signUpHref =
    redirectTo === SIGNED_IN_HOME
      ? '/sign-up'
      : `/sign-up?redirect=${encodeURIComponent(redirectTo)}`

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

    let result = await settleAuthRequest(
      authClient.signIn.email({ email: submittedEmail, password }),
    )

    // A 429 is retried after the server's Retry-After (plus jitter).
    for (
      let attempt = 0;
      result.error &&
      'status' in result.error &&
      result.error.status === 429 &&
      attempt < MAX_RETRIES;
      attempt++
    ) {
      setIsRetrying(true)
      const retryAfterSeconds =
        'retryAfterSeconds' in result.error &&
        typeof result.error.retryAfterSeconds === 'number'
          ? result.error.retryAfterSeconds
          : 3
      await sleep(retryAfterSeconds * 1000 + Math.random() * 500)
      result = await settleAuthRequest(
        authClient.signIn.email({ email: submittedEmail, password }),
      )
    }
    setIsRetrying(false)

    const { data, error: signInError } = result

    if (signInError) {
      setError(authErrorMessage(signInError, 'E-mail ou senha inválidos'))
      setIsPending(false)
      return
    }

    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      setEmail(submittedEmail)
      setIsPending(false)

      // Whoever used an authenticator app last time opens on the app step and
      // gets no e-mail: mailing a code they will not open was the whole cost
      // of auto-sending. The e-mailed code stays one click away.
      if (lastTwoFactorMethod() === 'totp') {
        setStep('totp')
        return
      }

      setStep('otp')
      const { error: sendError } = await settleAuthRequest(
        authClient.twoFactor.sendOtp(),
      )
      if (sendError) {
        // Platform admins with an authenticator are refused the e-mailed
        // factor server-side (src/lib/auth-email-otp-guard.ts). Take them
        // where they can actually finish instead of showing a dead end.
        if ('code' in sendError && sendError.code === 'EMAIL_OTP_NOT_ALLOWED') {
          rememberTwoFactorMethod('totp')
          setStep('totp')
          return
        }
        setOtpError(
          authErrorMessage(
            sendError,
            'Não foi possível enviar o código de acesso',
          ),
        )
      }
      return
    }

    push(redirectTo)
  }

  async function handleVerify(otp: string) {
    setOtpError(null)
    setIsVerifying(true)
    const { error: verifyError } = await settleAuthRequest(
      authClient.twoFactor.verifyOtp({ code: otp, trustDevice }),
    )
    setIsVerifying(false)

    if (verifyError) {
      setOtpError(authErrorMessage(verifyError, 'Código inválido ou expirado'))
      return
    }

    rememberTwoFactorMethod('otp')
    push(redirectTo)
  }

  async function handleResend() {
    setOtpError(null)
    const { error: resendError } = await settleAuthRequest(
      authClient.twoFactor.sendOtp(),
    )
    if (resendError) {
      setOtpError(
        authErrorMessage(resendError, 'Não foi possível reenviar o código'),
      )
    }
  }

  // The app code and a backup code differ only in their endpoint and copy.
  async function verifyTypedCode(
    e: React.SyntheticEvent<HTMLFormElement>,
    method: 'totp' | 'backup',
  ) {
    e.preventDefault()
    const code = (method === 'totp' ? totpCode : backupCode).trim()
    if (!code) {
      setOtpError(
        method === 'totp'
          ? 'Informe o código do aplicativo'
          : 'Informe um código de backup',
      )
      return
    }
    setOtpError(null)
    setIsVerifying(true)
    const { error: verifyError } = await settleAuthRequest(
      method === 'totp'
        ? authClient.twoFactor.verifyTotp({ code, trustDevice })
        : authClient.twoFactor.verifyBackupCode({ code, trustDevice }),
    )
    setIsVerifying(false)
    if (verifyError) {
      setOtpError(
        authErrorMessage(
          verifyError,
          method === 'totp'
            ? 'Código inválido ou expirado'
            : 'Código de backup inválido',
        ),
      )
      return
    }
    if (method === 'totp') rememberTwoFactorMethod('totp')
    push(redirectTo)
  }

  function goTo(next: Step) {
    setStep(next)
    setOtpError(null)
  }

  const trustDeviceField = (
    <SignInTrustDeviceField
      checked={trustDevice}
      onCheckedChange={setTrustDevice}
      disabled={isVerifying}
    />
  )

  return (
    <AuthLayout switchHref={signUpHref} switchLabel='Cadastre-se'>
      {step === 'form' && (
        <SignInCredentialsStep
          redirectTo={redirectTo}
          error={error}
          fieldErrors={fieldErrors}
          isPending={isPending}
          isRetrying={isRetrying}
          handleSubmit={handleSubmit}
        />
      )}

      {step === 'otp' && (
        <>
          <EmailValidationWithOtp
            email={email}
            onBack={() => goTo('form')}
            onVerify={handleVerify}
            onResend={handleResend}
            isPending={isVerifying}
            error={otpError}
            onUseBackupCode={() => goTo('backup')}
          />
          {trustDeviceField}
          <div className='text-center text-sm'>
            <button
              type='button'
              onClick={() => goTo('totp')}
              className='text-primary hover:underline'
            >
              Tenho um aplicativo autenticador
            </button>
          </div>
        </>
      )}

      {step === 'totp' && (
        <SignInCodeStep
          id='sign-in-totp-code'
          title='Abra seu aplicativo autenticador.'
          subtitle='Digite o código de 6 dígitos que ele está mostrando agora.'
          label='Código do aplicativo'
          placeholder='000000'
          numeric
          value={totpCode}
          onChange={setTotpCode}
          error={otpError}
          pending={isVerifying}
          trustDevice={trustDeviceField}
          onSubmit={(e) => verifyTypedCode(e, 'totp')}
          onUseEmail={() => {
            goTo('otp')
            setTotpCode('')
          }}
        />
      )}

      {step === 'backup' && (
        <SignInCodeStep
          id='sign-in-backup-code'
          title='Use um código de backup.'
          subtitle='Digite um dos códigos que você guardou ao ativar a verificação em duas etapas.'
          label='Código de backup'
          placeholder='xxxxxxxx'
          value={backupCode}
          onChange={setBackupCode}
          error={otpError}
          pending={isVerifying}
          trustDevice={trustDeviceField}
          onSubmit={(e) => verifyTypedCode(e, 'backup')}
          onUseEmail={() => {
            goTo('otp')
            setBackupCode('')
          }}
        />
      )}
    </AuthLayout>
  )
}

interface SignInTrustDeviceFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled: boolean
}

function SignInTrustDeviceField({
  checked,
  onCheckedChange,
  disabled,
}: SignInTrustDeviceFieldProps) {
  return (
    <Field orientation='horizontal'>
      <Checkbox
        id='sign-in-trust-device'
        checked={checked}
        onCheckedChange={(state) => onCheckedChange(state === true)}
        disabled={disabled}
      />
      <FieldLabel
        htmlFor='sign-in-trust-device'
        className='text-sm leading-5 text-muted-foreground'
      >
        Confiar neste dispositivo por 30 dias
      </FieldLabel>
    </Field>
  )
}
