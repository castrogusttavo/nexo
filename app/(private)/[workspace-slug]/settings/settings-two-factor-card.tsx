'use client'

import { useState } from 'react'
import { TwoFactorEnrollment } from '@/components/security/two-factor-enrollment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { authClient } from '@/src/lib/auth-client'
import { authErrorMessage } from '@/src/lib/auth-errors'

type Mode = 'idle' | 'enabling' | 'disabling'

export function SettingsTwoFactorCard() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const isEnabled = !!session?.user.twoFactorEnabled

  const [mode, setMode] = useState<Mode>('idle')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setMode('idle')
    setPassword('')
    setError(null)
    setBusy(false)
  }

  function handleToggle(next: boolean) {
    setError(null)
    setPassword('')
    setMode(next ? 'enabling' : 'disabling')
  }

  async function handleConfirm(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!password) {
      setError('Informe sua senha para continuar')
      return
    }
    setError(null)
    setBusy(true)

    if (mode === 'disabling') {
      const { error: disableError } = await authClient.twoFactor.disable({
        password,
      })
      setBusy(false)

      if (disableError) {
        setError(
          authErrorMessage(disableError, 'Não foi possível desativar a 2FA'),
        )
        return
      }

      reset()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificação em duas etapas (2FA)</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='space-y-1'>
            <p className='text-sm font-medium'>
              {isEnabled ? 'Ativa' : 'Inativa'}
            </p>
            <p className='text-sm text-muted-foreground'>
              Exija um segundo fator no login: um aplicativo autenticador ou um
              código de 6 dígitos por e-mail.
            </p>
          </div>
          <Switch
            checked={isEnabled}
            disabled={sessionPending || busy || mode !== 'idle'}
            onCheckedChange={handleToggle}
          />
        </div>

        {mode === 'enabling' && (
          <TwoFactorEnrollment onEnabled={reset} onCancel={reset} />
        )}

        {mode === 'disabling' && (
          <form onSubmit={handleConfirm} className='space-y-3 border-t pt-4'>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel>Senha para desativar a 2FA</FieldLabel>
              <Input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••'
                disabled={busy}
                autoFocus
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>

            <div className='flex gap-2 justify-end'>
              <Button
                type='button'
                variant='ghost'
                onClick={reset}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={busy}>
                {busy ? 'Processando...' : 'Desativar 2FA'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
