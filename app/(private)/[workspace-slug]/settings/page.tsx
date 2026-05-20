'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCookieConsent } from '@/app/_components/user/cookie-consent/provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { authClient } from '@/src/lib/auth-client'

type Mode = 'idle' | 'enabling' | 'disabling'
type DeleteState = 'idle' | 'confirming' | 'pending'
type CancelState = 'idle' | 'pending'

interface ProfileResponse {
  success: boolean
  data: {
    deletionScheduledAt: string | null
    acceptedTermsAt: string | null
    acceptedPrivacyAt: string | null
  }
}

export default function SettingsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const isEnabled = !!session?.user.twoFactorEnabled

  const [mode, setMode] = useState<Mode>('idle')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(
    null,
  )
  const [acceptedTermsAt, setAcceptedTermsAt] = useState<string | null>(null)
  const [acceptedPrivacyAt, setAcceptedPrivacyAt] = useState<string | null>(
    null,
  )
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [cancelState, setCancelState] = useState<CancelState>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { consent: cookieConsent, setConsent: setCookieConsent } =
    useCookieConsent()

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { cache: 'no-store' })
      if (!res.ok) return
      const json: ProfileResponse = await res.json()
      setDeletionScheduledAt(json.data.deletionScheduledAt)
      setAcceptedTermsAt(json.data.acceptedTermsAt)
      setAcceptedPrivacyAt(json.data.acceptedPrivacyAt)
    } catch {
      // ignore — UI just won't update; user can refresh
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  async function handleDeleteAccount() {
    setDeleteError(null)
    setDeleteState('pending')
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setDeleteError(
          json?.error?.message ?? 'Não foi possível agendar a exclusão',
        )
        setDeleteState('confirming')
        return
      }
      // DB sessions are revoked server-side, but better-auth's cookie
      // cache (5min) would keep this tab "logged in". Sign out on the
      // client to drop the cookie immediately.
      await authClient.signOut()
      window.location.href = '/'
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erro de rede')
      setDeleteState('confirming')
    }
  }

  async function handleCancelDeletion() {
    setDeleteError(null)
    setCancelState('pending')
    try {
      const res = await fetch('/api/users/me/deletion', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setDeleteError(
          json?.error?.message ?? 'Não foi possível cancelar a exclusão',
        )
        setCancelState('idle')
        return
      }
      setDeletionScheduledAt(null)
      setCancelState('idle')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erro de rede')
      setCancelState('idle')
    }
  }

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

  const scheduledDate = deletionScheduledAt
    ? new Date(deletionScheduledAt).toLocaleString('pt-BR')
    : null
  const termsDate = acceptedTermsAt
    ? new Date(acceptedTermsAt).toLocaleDateString('pt-BR')
    : null
  const privacyDate = acceptedPrivacyAt
    ? new Date(acceptedPrivacyAt).toLocaleDateString('pt-BR')
    : null
  const cookiesAccepted = cookieConsent === 'accepted'

  return (
    <div className='flex-1 p-6 max-w-3xl mx-auto w-full space-y-6'>
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
                  Senha para {mode === 'enabling' ? 'ativar' : 'desativar'} a
                  2FA
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

      <Card>
        <CardHeader>
          <CardTitle>Privacidade</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between gap-4'>
            <div className='space-y-1'>
              <p className='text-sm font-medium'>Cookies de análise</p>
              <p className='text-sm text-muted-foreground'>
                {cookieConsent === null
                  ? 'Você ainda não decidiu sobre o uso de cookies de análise.'
                  : cookiesAccepted
                    ? 'Aceitos. Você pode revogar a qualquer momento.'
                    : 'Recusados. Nenhum tracker de análise é carregado.'}
              </p>
            </div>
            <Switch
              checked={cookiesAccepted}
              onCheckedChange={(next) =>
                setCookieConsent(next ? 'accepted' : 'rejected')
              }
            />
          </div>

          <div className='border-t pt-4 space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Termos de Serviço</span>
              <span>
                {termsDate ? `Aceito em ${termsDate}` : 'Pendente de aceite'}
              </span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>
                Política de Privacidade
              </span>
              <span>
                {privacyDate
                  ? `Aceita em ${privacyDate}`
                  : 'Pendente de aceite'}
              </span>
            </div>
            <p className='text-sm text-muted-foreground pt-2'>
              Para revogar o aceite dos Termos ou da Política de Privacidade,
              você precisa excluir sua conta: não é possível manter a conta
              ativa sem esses aceites.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='border-destructive/40'>
        <CardHeader>
          <CardTitle className='text-destructive'>Excluir conta</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {scheduledDate ? (
            <div className='space-y-3'>
              <p className='text-sm'>
                Exclusão agendada para{' '}
                <span className='font-medium'>{scheduledDate}</span>. Você pode
                cancelar a qualquer momento antes dessa data.
              </p>
              {deleteError && (
                <p className='text-sm text-destructive'>{deleteError}</p>
              )}
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleCancelDeletion}
                  disabled={cancelState === 'pending'}
                >
                  {cancelState === 'pending'
                    ? 'Cancelando...'
                    : 'Cancelar exclusão'}
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              <p className='text-sm text-muted-foreground'>
                A conta será agendada para exclusão. Suas sessões serão
                encerradas e você precisará entrar novamente para cancelar.
              </p>
              {deleteError && (
                <p className='text-sm text-destructive'>{deleteError}</p>
              )}
              {deleteState === 'idle' && (
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    variant='destructive'
                    onClick={() => setDeleteState('confirming')}
                  >
                    Excluir conta
                  </Button>
                </div>
              )}
              {deleteState !== 'idle' && (
                <div className='flex justify-end gap-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => {
                      setDeleteState('idle')
                      setDeleteError(null)
                    }}
                    disabled={deleteState === 'pending'}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type='button'
                    variant='destructive'
                    onClick={handleDeleteAccount}
                    disabled={deleteState === 'pending'}
                  >
                    {deleteState === 'pending'
                      ? 'Agendando...'
                      : 'Confirmar exclusão'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
