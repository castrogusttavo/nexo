'use client'

import { useState } from 'react'
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
import { notify } from '@/lib/notify'
import { authClient } from '@/src/lib/auth-client'

interface UserModalSecurityTwoFactorFieldProps {
  twoFactorEnabled: boolean
  isPending: boolean
  hasPassword: boolean | null
}

export function UserModalSecurityTwoFactorField({
  twoFactorEnabled,
  isPending,
  hasPassword,
}: UserModalSecurityTwoFactorFieldProps) {
  const [twoFactorPassword, setTwoFactorPassword] = useState('')
  const [twoFactorMode, setTwoFactorMode] = useState<
    'idle' | 'enabling' | 'disabling' | 'regenerating'
  >('idle')
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

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

  return (
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
              Guarde estes códigos em local seguro. Cada um só pode ser usado
              uma vez e não serão exibidos novamente.
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
  )
}
