'use client'

import { Image } from '@hugeicons-pro/core-stroke-rounded'
import { useActionState, useRef, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { ApiError } from '@/src/hooks/_fetch'
import { type ProfileSetupState, saveProfileSetup } from './actions'
import { ProfileTwoFactorSection } from './profile-two-factor-section'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setUploading(true)
    const fd = new FormData()
    fd.append('avatars', file)

    async function run() {
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        throw new ApiError(json?.error?.message ?? 'Erro ao enviar imagem')
      }
      setImageUrl(`${json.data.url}?t=${Date.now()}`)
    }

    try {
      await notify.mutate(run(), {
        loading: 'Enviando imagem...',
        success: 'Imagem enviada',
        error: 'Erro ao enviar imagem',
      })
    } catch {
      //
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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

      <ProfileTwoFactorSection
        twoFactorEnabled={twoFactorEnabled}
        hasPassword={hasPassword}
      />

      <Button type='submit' className='w-full' disabled={!isValid || isPending}>
        Continuar
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
