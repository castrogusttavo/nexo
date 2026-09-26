'use client'

import { useId, useMemo, useState } from 'react'
import { renderSVG } from 'uqr'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { authClient } from '@/src/lib/auth-client'
import { authErrorMessage } from '@/src/lib/auth-errors'

type Method = 'totp' | 'otp'
type Step = 'method' | 'scan' | 'codes'

interface TwoFactorEnrollmentProps {
  /** Called once the second factor is actually active on the account. */
  onEnabled: () => void | Promise<void>
  onCancel: () => void
}

/**
 * Turning the second factor on, for both methods better-auth supports.
 *
 * `otp` sends a code to the account's e-mail, which is already verified at this
 * point, so it activates on the spot. `totp` writes a secret that only counts
 * once the user types a code their authenticator produced: an account is not
 * protected by a QR code nobody scanned, and skipping the check is how people
 * lock themselves out at the next sign-in. Backup codes exist only for `totp`,
 * because for `otp` the mailbox already is the recovery path.
 */
export function TwoFactorEnrollment({
  onEnabled,
  onCancel,
}: TwoFactorEnrollmentProps) {
  const fieldId = useId()
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<Method>('totp')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const qrSvg = useMemo(
    () => (totpUri ? renderSVG(totpUri, { border: 1 }) : null),
    [totpUri],
  )

  // Authenticator apps that cannot scan take the secret typed by hand.
  const manualSecret = useMemo(() => {
    if (!totpUri) return null
    try {
      return new URL(totpUri).searchParams.get('secret')
    } catch {
      return null
    }
  }, [totpUri])

  async function refreshSession() {
    await authClient.getSession({ query: { disableCookieCache: true } })
  }

  async function handleEnable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!password) {
      setError('Informe sua senha para continuar')
      return
    }
    setError(null)
    setBusy(true)

    const { data, error: enableError } = await authClient.twoFactor.enable({
      password,
      method,
    })
    setBusy(false)

    if (enableError) {
      setError(authErrorMessage(enableError, 'Não foi possível ativar a 2FA'))
      return
    }

    setPassword('')

    if (!data || data.method === 'otp') {
      await refreshSession()
      await onEnabled()
      return
    }

    setTotpUri(data.totpURI)
    setBackupCodes(data.backupCodes)
    setStep('scan')
  }

  async function handleVerifyTotp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!code.trim()) {
      setError('Informe o código do aplicativo')
      return
    }
    setError(null)
    setBusy(true)

    const { error: verifyError } = await authClient.twoFactor.verifyTotp({
      code: code.trim(),
    })
    setBusy(false)

    if (verifyError) {
      setError(authErrorMessage(verifyError, 'Código inválido ou expirado'))
      return
    }

    setCode('')
    await refreshSession()
    setStep('codes')
  }

  async function copyBackupCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      notify.success('Códigos de backup copiados')
    } catch {
      // Clipboard access can be denied; the codes stay on screen either way.
    }
  }

  if (step === 'codes') {
    return (
      <div className='flex flex-col gap-3 border-t border-border pt-4'>
        <div>
          <p className='text-sm font-medium'>Códigos de backup</p>
          <p className='text-sm text-muted-foreground'>
            Guarde estes códigos em local seguro. Cada um só pode ser usado uma
            vez e não serão exibidos novamente.
          </p>
        </div>
        <div className='grid grid-cols-2 gap-2 rounded-md border border-border p-3 font-mono text-sm'>
          {backupCodes.map((backupCode) => (
            <span key={backupCode}>{backupCode}</span>
          ))}
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={copyBackupCodes}
          >
            Copiar códigos
          </Button>
          <Button type='button' size='sm' onClick={() => onEnabled()}>
            Concluir
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'scan') {
    return (
      <form
        onSubmit={handleVerifyTotp}
        className='flex flex-col gap-3 border-t border-border pt-4'
      >
        <div>
          <p className='text-sm font-medium'>
            Escaneie o QR code no seu aplicativo
          </p>
          <p className='text-sm text-muted-foreground'>
            Use o Google Authenticator, o 1Password, o Bitwarden ou qualquer
            app compatível e digite o código de 6 dígitos que ele mostrar.
          </p>
        </div>

        {qrSvg && (
          <div
            aria-label='QR code para o aplicativo autenticador'
            role='img'
            className='mx-auto w-44 [&_svg]:h-full [&_svg]:w-full'
            // uqr renders a self-contained SVG string from the otpauth URI.
            // biome-ignore lint/security/noDangerouslySetInnerHtml: local SVG, no user input
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}

        {manualSecret && (
          <p className='text-center text-xs text-muted-foreground'>
            Não consegue escanear? Use a chave{' '}
            <code className='font-mono'>{manualSecret}</code>
          </p>
        )}

        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor={`${fieldId}-totp`}>
            Código do aplicativo
          </FieldLabel>
          <Input
            id={`${fieldId}-totp`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='000000'
            inputMode='numeric'
            autoComplete='one-time-code'
            disabled={busy}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>

        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='ghost'
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button type='submit' disabled={busy}>
            {busy ? 'Verificando...' : 'Confirmar código'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form
      onSubmit={handleEnable}
      className='flex flex-col gap-3 border-t border-border pt-4'
    >
      <fieldset className='flex flex-col gap-2'>
        <legend className='text-sm font-medium'>
          Como você quer receber o segundo fator?
        </legend>
        <label
          htmlFor={`${fieldId}-totp-method`}
          className='flex items-start gap-2 text-sm'
        >
          <input
            id={`${fieldId}-totp-method`}
            type='radio'
            name={`${fieldId}-method`}
            value='totp'
            checked={method === 'totp'}
            onChange={() => setMethod('totp')}
            disabled={busy}
            className='mt-1'
          />
          <span>
            Aplicativo autenticador
            <span className='block text-muted-foreground'>
              Funciona sem internet e sem depender do e-mail. Gera códigos de
              backup.
            </span>
          </span>
        </label>
        <label
          htmlFor={`${fieldId}-otp-method`}
          className='flex items-start gap-2 text-sm'
        >
          <input
            id={`${fieldId}-otp-method`}
            type='radio'
            name={`${fieldId}-method`}
            value='otp'
            checked={method === 'otp'}
            onChange={() => setMethod('otp')}
            disabled={busy}
            className='mt-1'
          />
          <span>
            Código por e-mail
            <span className='block text-muted-foreground'>
              Enviamos um código de 6 dígitos a cada login.
            </span>
          </span>
        </label>
      </fieldset>

      <Field data-invalid={!!error || undefined}>
        <FieldLabel htmlFor={`${fieldId}-password`}>
          Senha para ativar a 2FA
        </FieldLabel>
        <Input
          id={`${fieldId}-password`}
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='••••••'
          disabled={busy}
          autoFocus
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>

      <div className='flex justify-end gap-2'>
        <Button type='button' variant='ghost' onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type='submit' disabled={busy}>
          {busy ? 'Processando...' : 'Ativar 2FA'}
        </Button>
      </div>
    </form>
  )
}
