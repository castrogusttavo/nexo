'use client'

import { Image } from '@hugeicons-pro/core-stroke-rounded'
import { useActionState, useRef, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { authClient } from '@/src/lib/auth-client'
import { type ProfileSetupState, saveProfileSetup } from './actions'

type TwoFAMode = 'idle' | 'enabling' | 'disabling'

const INITIAL_STATE: ProfileSetupState = { ok: false }

export function ProfileForm({
  name,
  image,
  twoFactorEnabled,
  hasPassword,
}: {
  name: string
  image: string | null
  twoFactorEnabled: boolean
  hasPassword: boolean
}) {
  const [nameValue, setNameValue] = useState(name)
  const [imageUrl, setImageUrl] = useState<string | null>(image)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [is2FAEnabled, setIs2FAEnabled] = useState(twoFactorEnabled)
  const [twoFAMode, setTwoFAMode] = useState<TwoFAMode>('idle')
  const [twoFAPass, setTwoFAPass] = useState('')
  const [twoFAError, setTwoFAError] = useState<string | null>(null)
  const [twoFABusy, setTwoFABusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const [state, formAction, isPending] = useActionState(
    saveProfileSetup,
    INITIAL_STATE,
  )

  const initials = nameValue
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatars', file)
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(json?.error?.message ?? 'Erro ao enviar imagem')
        return
      }
      setImageUrl(`${json.data.url}?t=${Date.now()}`)
    } catch {
      setUploadError('Erro de rede ao enviar imagem')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handle2FAToggle(next: boolean) {
    setTwoFAError(null)
    setBackupCodes([])
    setTwoFAPass('')
    setTwoFAMode(next ? 'enabling' : 'disabling')
  }

  function reset2FA() {
    setTwoFAMode('idle')
    setTwoFAPass('')
    setTwoFAError(null)
  }

  async function handle2FAConfirm() {
    if (!twoFAPass) {
      setTwoFAError('Informe sua senha para continuar')
      return
    }
    setTwoFAError(null)
    setTwoFABusy(true)

    if (twoFAMode === 'enabling') {
      const { data, error } = await authClient.twoFactor.enable({
        password: twoFAPass,
      })
      setTwoFABusy(false)
      if (error) {
        setTwoFAError(error.message ?? 'Não foi possível ativar a 2FA')
        return
      }
      setIs2FAEnabled(true)
      setBackupCodes(data?.backupCodes ?? [])
      setTwoFAMode('idle')
      setTwoFAPass('')
      return
    }

    const { error } = await authClient.twoFactor.disable({
      password: twoFAPass,
    })
    setTwoFABusy(false)
    if (error) {
      setTwoFAError(error.message ?? 'Não foi possível desativar a 2FA')
      return
    }
    setIs2FAEnabled(false)
    reset2FA()
  }

  const isValid = nameValue.trim().length >= 2

  return (
    <form action={formAction} className='flex flex-col gap-10'>
      <div className='flex items-center gap-4'>
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className='flex items-center gap-4'
        >
          <Avatar className='size-12'>
            <AvatarImage src={imageUrl ?? undefined} />
            <AvatarFallback className='text-lg'>
              {initials || '??'}
            </AvatarFallback>
          </Avatar>
          <Field orientation='horizontal'>
            <FieldLabel
              htmlFor='image'
              className='text-muted-foreground hover:text-primary/75'
            >
              <NexoIcon icon={Image} strokeWidth={2} size={16} />
              Mudar imagem
            </FieldLabel>
            <Input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              hidden
              onChange={handleImageChange}
            />
          </Field>
        </button>
        {uploadError && (
          <p className='text-sm text-destructive text-center' role='alert'>
            {uploadError}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Field>
          <FieldLabel htmlFor='name'>
            Nome <span className='text-destructive'>*</span>
          </FieldLabel>
          <Input
            id='name'
            name='name'
            type='text'
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder='Seu nome'
            disabled={isPending}
            autoFocus
          />
        </Field>
        {state.error && (
          <p className='text-sm text-destructive' role='alert'>
            {state.error}
          </p>
        )}
      </div>

      <Accordion className='bg-card px-3 py-1 rounded-lg'>
        <AccordionItem value='2fa'>
          <AccordionTrigger className='no-underline hover:no-underline'>
            <div className='flex items-center gap-2'>
              <span>Verificação em duas etapas</span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  is2FAEnabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {is2FAEnabled ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {/* Switch row */}
            <div className='flex items-center justify-between gap-4 pb-3'>
              <p className='text-sm text-muted-foreground m-0!'>
                {!hasPassword
                  ? 'Disponível apenas para contas com senha definida.'
                  : is2FAEnabled
                    ? 'Código por e-mail a cada login.'
                    : 'Recomendada para maior segurança.'}
              </p>
              <Switch
                checked={is2FAEnabled}
                disabled={!hasPassword || twoFABusy || twoFAMode !== 'idle'}
                onCheckedChange={handle2FAToggle}
              />
            </div>

            {/* Password form */}
            {twoFAMode !== 'idle' && (
              <div className='flex flex-col gap-3 border-t pt-3'>
                <Field data-invalid={!!twoFAError || undefined}>
                  <FieldLabel>
                    Senha para{' '}
                    {twoFAMode === 'enabling' ? 'ativar' : 'desativar'} a 2FA
                  </FieldLabel>
                  <Input
                    type='password'
                    value={twoFAPass}
                    onChange={(e) => setTwoFAPass(e.target.value)}
                    placeholder='••••••'
                    disabled={twoFABusy}
                    autoFocus
                  />
                  {twoFAError && (
                    <p className='text-sm text-destructive' role='alert'>
                      {twoFAError}
                    </p>
                  )}
                </Field>
                <div className='flex gap-2 justify-end'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={reset2FA}
                    disabled={twoFABusy}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    onClick={handle2FAConfirm}
                    disabled={twoFABusy}
                  >
                    {twoFABusy
                      ? 'Processando…'
                      : twoFAMode === 'enabling'
                        ? 'Ativar 2FA'
                        : 'Desativar 2FA'}
                  </Button>
                </div>
              </div>
            )}

            {/* Backup codes */}
            {backupCodes && backupCodes.length > 0 && (
              <div className='flex flex-col gap-2 border-t pt-3'>
                <p className='text-sm font-medium'>Códigos de backup</p>
                <p className='text-xs text-muted-foreground'>
                  Guarde em local seguro. Cada código só pode ser usado uma vez.
                </p>
                <div className='grid grid-cols-2 gap-1.5 rounded-md border p-3 font-mono text-xs'>
                  {backupCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type='submit' className='w-full' disabled={!isValid || isPending}>
        {isPending ? 'Salvando...' : 'Continuar'}
      </Button>

      <Field orientation='horizontal' className='w-fit mx-auto'>
        <Checkbox
          id='marketing'
          name='marketingConsent'
          disabled={isPending}
          defaultChecked
        />
        <FieldLabel
          htmlFor='marketing'
          className='text-xs text-muted-foreground'
        >
          Quero receber comunicações de marketing do Nexo
        </FieldLabel>
      </Field>
    </form>
  )
}
