'use client'

import { Image } from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { useActionState, useRef, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/user-avatar'
import { notify } from '@/lib/notify'
import { useUploadAvatar } from '@/src/hooks/use-user'
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
  // Drafts seeded from the server: the step edits its own copy until it is submitted.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [nameValue, setNameValue] = useState(name)
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [imageUrl, setImageUrl] = useState<string | null>(image)
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refresh } = useRouter()

  const [state, formAction, isPending] = useActionState(
    saveProfileSetup,
    INITIAL_STATE,
  )

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const upload = uploadAvatar.mutateAsync(file)
    const ok = await notify.run(upload, {
      loading: 'Enviando imagem...',
      success: 'Imagem enviada',
      error: 'Erro ao enviar imagem',
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!ok) return
    setImageUrl(`${await upload}?t=${Date.now()}`)
    // The header lives in the layout; re-render it so it picks up the new
    // avatar. Client state (the typed name) survives a refresh.
    refresh()
  }

  const isValid = nameValue.trim().length >= 2

  return (
    <form action={formAction} className='flex flex-col gap-10'>
      <div className='flex items-center gap-4'>
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
          aria-label='Mudar imagem'
          className='flex items-center gap-4'
        >
          <UserAvatar
            name={nameValue}
            image={imageUrl}
            className='size-12'
            fallbackClassName='text-lg'
          />
          {/* A span, not a label: the button already opens the picker, and
              label/input are invalid inside a button. */}
          <span className='flex items-center gap-2 text-sm leading-none font-medium text-muted-foreground hover:text-primary/75'>
            <NexoIcon icon={Image} strokeWidth={2} size={16} />
            Mudar imagem
          </span>
        </button>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          aria-label='Foto de perfil'
          hidden
          onChange={handleImageChange}
        />
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
        <Checkbox id='marketing' name='marketingConsent' disabled={isPending} />
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
