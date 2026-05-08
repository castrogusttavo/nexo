'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { authClient } from '@/src/lib/auth-client'

type Mode = 'idle' | 'enabling' | 'disabling'

export default function SettingsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const isEnabled = !!session?.user.twoFactorEnabled

  const [mode, setMode] = useState<Mode>('idle')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  function reset() {
    setMode('idle')
    setPassword('')
    setError(null)
    setBusy(false)
  }

  function handleToggle(next: boolean) {
    setError(null)
    setBackupCodes(null)
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

    if (mode === 'enabling') {
      const { data, error: enableError } = await authClient.twoFactor.enable({
        password,
      })
      setBusy(false)

      if (enableError) {
        setError(enableError.message ?? 'Não foi possível ativar a 2FA')
        return
      }

      setBackupCodes(data?.backupCodes ?? [])
      setMode('idle')
      setPassword('')
      return
    }

    if (mode === 'disabling') {
      const { error: disableError } = await authClient.twoFactor.disable({
        password,
      })
      setBusy(false)

      if (disableError) {
        setError(disableError.message ?? 'Não foi possível desativar a 2FA')
        return
      }

      reset()
    }
  }

  async function handleCopyCodes() {
    if (!backupCodes) return
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
    } catch {
      // ignore
    }
  }

  return (
    <div className='flex-1 p-6 max-w-3xl mx-auto w-full'>
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
                Receba um código de 6 dígitos por e-mail no login para reforçar
                a segurança da sua conta.
              </p>
            </div>
            <Switch
              checked={isEnabled}
              disabled={sessionPending || busy || mode !== 'idle'}
              onCheckedChange={handleToggle}
            />
          </div>

          {mode !== 'idle' && (
            <form onSubmit={handleConfirm} className='space-y-3 border-t pt-4'>
              <Field data-invalid={!!error || undefined}>
                <FieldLabel>
                  Senha para {mode === 'enabling' ? 'ativar' : 'desativar'} a 2FA
                </FieldLabel>
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
                  {busy
                    ? 'Processando...'
                    : mode === 'enabling'
                      ? 'Ativar 2FA'
                      : 'Desativar 2FA'}
                </Button>
              </div>
            </form>
          )}

          {backupCodes && backupCodes.length > 0 && (
            <div className='space-y-3 border-t pt-4'>
              <div>
                <p className='text-sm font-medium'>Códigos de backup</p>
                <p className='text-sm text-muted-foreground'>
                  Guarde estes códigos em local seguro. Cada código só pode ser
                  usado uma vez e não serão exibidos novamente.
                </p>
              </div>
              <div className='grid grid-cols-2 gap-2 rounded-md border p-3 font-mono text-sm'>
                {backupCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleCopyCodes}
                >
                  Copiar códigos
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
