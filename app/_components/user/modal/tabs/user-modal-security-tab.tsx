'use client'

import { useEffect, useState } from 'react'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TabsContent } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import { authClient } from '@/src/lib/auth-client'
import { useCookieConsent } from '../../cookie-consent/provider'

export function UserModalSecurityTab({ tab }: { tab: string }) {
  const { data: session, isPending } = authClient.useSession()
  const { consent, setConsent } = useCookieConsent()
  const twoFactorEnabled = !!session?.user.twoFactorEnabled

  // Password (reset via email — handled by the dedicated /reset-password page)
  const [pwBusy, setPwBusy] = useState(false)

  //2 FA
  const [twoFactorPassword, setTwoFactorPassword] = useState('')
  const [twoFactorMode, setTwoFactorMode] = useState<
    'idle' | 'enabling' | 'disabling' | 'regenerating'
  >('idle')
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    authClient.listAccounts().then(({ data }) => {
      if (!active) return
      setHasPassword(!!data?.some((acc) => acc.providerId === 'credential'))
    })
    return () => {
      active = false
    }
  }, [])

  async function handlePasswordReset() {
    if (!session?.user.email) return
    setPwBusy(true)
    const { error } = await authClient.requestPasswordReset({
      email: session.user.email,
      redirectTo: '/reset-password',
    })
    setPwBusy(false)
    if (error) {
      notify.error(error.message ?? 'Não foi possível enviar o e-mail')
      return
    }
    notify.success(
      hasPassword === false
        ? 'Enviamos um e-mail para você definir sua senha'
        : 'Enviamos um e-mail para você redefinir sua senha',
    )
  }

  function toggleTwoFactor(next: boolean) {
    setTwoFactorError(null)
    setBackupCodes(null)
    setTwoFactorPassword('')
    setTwoFactorMode(next ? 'enabling' : 'disabling')
  }

  function startRegenerateBackupCodes() {
    setTwoFactorError(null)
    setBackupCodes(null)
    setTwoFactorPassword('')
    setTwoFactorMode('regenerating')
  }

  async function confirmTwoFactor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!twoFactorPassword) {
      setTwoFactorError('Informe sua senha para continuar')
      return
    }
    setTwoFactorError(null)
    setTwoFactorBusy(true)

    if (twoFactorMode === 'enabling') {
      const { data, error } = await authClient.twoFactor.enable({
        password: twoFactorPassword,
      })
      setTwoFactorBusy(false)
      if (error) {
        setTwoFactorError(error.message ?? 'Não foi possível ativar a 2FA')
        return
      }
      setBackupCodes(data?.backupCodes ?? [])
      setTwoFactorMode('idle')
      setTwoFactorPassword('')
      await authClient.getSession({ query: { disableCookieCache: true } })
      return
    }

    if (twoFactorMode === 'regenerating') {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({
        password: twoFactorPassword,
      })
      setTwoFactorBusy(false)
      if (error) {
        setTwoFactorError(
          error.message ?? 'Não foi possível gerar novos códigos',
        )
        return
      }
      // Os códigos antigos foram invalidados; mostra o novo conjunto uma vez.
      setBackupCodes(data?.backupCodes ?? [])
      setTwoFactorMode('idle')
      setTwoFactorPassword('')
      return
    }

    const { error } = await authClient.twoFactor.disable({
      password: twoFactorPassword,
    })
    setTwoFactorBusy(false)
    if (error) {
      setTwoFactorError(error.message ?? 'Não foi possível desativar a 2FA')
      return
    }
    setTwoFactorMode('idle')
    setTwoFactorPassword('')
    await authClient.getSession({ query: { disableCookieCache: true } })
  }

  async function copyBackupCodes() {
    if (!backupCodes) return
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      notify.success('Códigos de backup copiados')
    } catch {
      // ignore
    }
  }

  const cookiesAccepted = consent === 'accepted'

  return (
    <TabsContent value={tab}>
      <div className='flex flex-col gap-7 w-full'>
        <div>
          <H4>Segurança</H4>
          <Muted>
            Gerencie sua senha, verificação em duas etapas e privacidade
          </Muted>
        </div>

        {/* Password — handled by the dedicated /reset-password page */}
        <div className='flex justify-between items-center gap-3'>
          <Field>
            <FieldLabel>Senha</FieldLabel>
            <FieldDescription>
              {hasPassword === false
                ? 'Sua conta foi criada com login social e ainda não tem senha. Enviaremos um e-mail com um link para você definir uma.'
                : 'Enviaremos um e-mail com um link seguro para redefinir sua senha. Por segurança, isso encerra suas sessões e exige um novo login.'}
            </FieldDescription>
          </Field>
          <div className='flex justify-end'>
            <Button
              type='button'
              onClick={handlePasswordReset}
              disabled={pwBusy}
              size='sm'
            >
              {pwBusy
                ? 'Enviando...'
                : hasPassword === false
                  ? 'Definir senha'
                  : 'Redefinir senha'}
            </Button>
          </div>
        </div>

        {/* 2FA */}
        <div className='flex flex-col gap-y-1'>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Verificação em duas etapas (2FA)</FieldLabel>
              <FieldDescription>
                {hasPassword === false
                  ? 'Defina uma senha antes de ativar a verificação em duas etapas.'
                  : 'Receba um código de 6 dígitos por e-mail no login para reforçar a segurança da sua conta.'}
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={twoFactorEnabled}
              disabled={
                isPending ||
                twoFactorBusy ||
                twoFactorMode !== 'idle' ||
                hasPassword !== true
              }
              onCheckedChange={toggleTwoFactor}
            />
          </Field>

          {twoFactorEnabled && twoFactorMode === 'idle' && (
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={startRegenerateBackupCodes}
              >
                Gerar novos códigos de backup
              </Button>
            </div>
          )}

          {twoFactorMode !== 'idle' && (
            <form
              onSubmit={confirmTwoFactor}
              className='flex flex-col gap-3 border-t border-border pt-4'
            >
              <Field data-invalid={!!twoFactorError || undefined}>
                <FieldLabel>
                  {twoFactorMode === 'enabling'
                    ? 'Senha para ativar a 2FA'
                    : twoFactorMode === 'regenerating'
                      ? 'Senha para gerar novos códigos de backup'
                      : 'Senha para desativar a 2FA'}
                </FieldLabel>
                <Input
                  type='password'
                  value={twoFactorPassword}
                  onChange={(e) => setTwoFactorPassword(e.target.value)}
                  placeholder='••••••'
                  disabled={twoFactorBusy}
                  autoFocus
                />
                {twoFactorError && <FieldError>{twoFactorError}</FieldError>}
              </Field>
              <div className='flex gap-2 justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => setTwoFactorMode('idle')}
                  disabled={twoFactorBusy}
                >
                  Cancelar
                </Button>
                <Button type='submit' disabled={twoFactorBusy}>
                  {twoFactorBusy
                    ? 'Processando...'
                    : twoFactorMode === 'enabling'
                      ? 'Ativar 2FA'
                      : twoFactorMode === 'regenerating'
                        ? 'Gerar códigos'
                        : 'Desativar 2FA'}
                </Button>
              </div>
            </form>
          )}

          {backupCodes && backupCodes.length > 0 && (
            <div className='flex flex-col gap-3 border-t border-border pt-4'>
              <div>
                <p className='text-sm font-medium'>Códigos de backup</p>
                <Muted>
                  Guarde estes códigos em local seguro. Cada um só pode ser
                  usado uma vez e não serão exibidos novamente.
                </Muted>
              </div>
              <div className='grid grid-cols-2 gap-2 rounded-md border border-border p-3 font-mono text-sm'>
                {backupCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={copyBackupCodes}
                >
                  Copiar códigos
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Privacy */}
        <div>
          <Field orientation='horizontal' className='py-3'>
            <FieldContent>
              <FieldLabel>Cookies de análise</FieldLabel>
              <FieldDescription>
                {consent === null
                  ? 'Você ainda não decidiu sobre o uso de cookies de análise.'
                  : cookiesAccepted
                    ? 'Aceitos. Você pode revogar a qualquer momento.'
                    : 'Recusados. Nenhum tracker de análise é carregado.'}
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={cookiesAccepted}
              onCheckedChange={(next) =>
                setConsent(next ? 'accepted' : 'rejected')
              }
            />
          </Field>
        </div>
      </div>
    </TabsContent>
  )
}
