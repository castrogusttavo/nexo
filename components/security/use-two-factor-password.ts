'use client'

import { useState } from 'react'
import { authClient } from '@/src/lib/auth-client'
import { authErrorMessage } from '@/src/lib/auth-errors'
import { settleAuthRequest } from '@/src/lib/auth-request'

export type TwoFactorPasswordAction = 'enable' | 'disable' | 'regenerate'

type AuthResult = { data?: unknown; error?: unknown }

const ACTIONS: Record<
  TwoFactorPasswordAction,
  { run: (password: string) => Promise<AuthResult>; failure: string }
> = {
  // The e-mail code second factor; the authenticator app goes through
  // TwoFactorEnrollment instead, which verifies a code before enabling.
  enable: {
    run: (password) => authClient.twoFactor.enable({ password, method: 'otp' }),
    failure: 'Não foi possível ativar a 2FA',
  },
  disable: {
    run: (password) => authClient.twoFactor.disable({ password }),
    failure: 'Não foi possível desativar a 2FA',
  },
  regenerate: {
    run: (password) => authClient.twoFactor.generateBackupCodes({ password }),
    failure: 'Não foi possível gerar novos códigos',
  },
}

// The "confirm with your password" step every two-factor change goes
// through: which change is pending, the typed password, the error and the
// request in flight. `onDone` receives what better-auth returned.
export function useTwoFactorPassword(
  onDone?: (action: TwoFactorPasswordAction, data: unknown) => void,
) {
  const [action, setAction] = useState<TwoFactorPasswordAction | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function start(next: TwoFactorPasswordAction) {
    setAction(next)
    setPassword('')
    setError(null)
  }

  function cancel() {
    setAction(null)
    setPassword('')
    setError(null)
  }

  async function confirm() {
    if (!action) return
    if (!password) {
      setError('Informe sua senha para continuar')
      return
    }
    setError(null)
    setBusy(true)
    try {
      // A dropped connection rejects instead of resolving { error }.
      const { data, error: failure } = await settleAuthRequest(
        ACTIONS[action].run(password),
      )
      if (failure) {
        setError(authErrorMessage(failure, ACTIONS[action].failure))
        return
      }
      const done = action
      cancel()
      onDone?.(done, data)
    } finally {
      setBusy(false)
    }
  }

  return { action, password, setPassword, error, busy, start, cancel, confirm }
}

export type TwoFactorPasswordState = ReturnType<typeof useTwoFactorPassword>
