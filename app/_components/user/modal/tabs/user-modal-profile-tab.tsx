'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useId, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/user-avatar'
import { notify } from '@/lib/notify'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import {
  useCancelAccountDeletion,
  useDeleteAccount,
  useUpdateUser,
  useUploadAvatar,
  useUser,
} from '@/src/hooks/use-user'
import { authClient } from '@/src/lib/auth-client'
import type { UserDTO } from '@/types/user'
import { UserCoverImagePicker } from '../../user-cover-image-picker'

export function UserModalProfileTab({ tab }: { tab: string }) {
  const { data: user } = useUser()
  const deleteAccount = useDeleteAccount()
  const router = useRouter()

  async function handleDeleteAccount() {
    const ok = await notify.run(deleteAccount.mutateAsync(), {
      loading: 'Desativando a conta...',
      success: 'Conta desativada. Você será desconectado',
      error: 'Erro ao desativar a conta',
    })
    if (!ok) return
    await authClient.signOut()
    router.push('/sign-in')
  }

  return (
    <TabsContent value={tab}>
      {/* Keyed by user id so the inputs re-seed once a cold user query loads. */}
      <UserModalProfileForm key={user?.id} user={user} />
      {user?.deletionScheduledAt ? (
        <UserModalProfileScheduledDeletion
          scheduledAt={user.deletionScheduledAt}
        />
      ) : (
        <UserModalProfileDeleteAccount
          pending={deleteAccount.isPending}
          onConfirm={handleDeleteAccount}
        />
      )}
    </TabsContent>
  )
}

function UserModalProfileScheduledDeletion({
  scheduledAt,
}: {
  scheduledAt: string
}) {
  const cancelDeletion = useCancelAccountDeletion()

  async function handleCancel() {
    await notify.run(cancelDeletion.mutateAsync(), {
      loading: 'Cancelando a exclusão...',
      success: 'Exclusão cancelada',
      error: 'Erro ao cancelar a exclusão',
    })
  }

  return (
    <div className='w-full mt-10 bg-card rounded-lg border-border px-4 py-3 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 md:gap-8'>
      <div className='flex-1 flex flex-col gap-1.5'>
        <H4 className='text-sm'>Exclusão agendada</H4>
        <Muted className='text-xs'>
          Sua conta será excluída em{' '}
          {new Date(scheduledAt).toLocaleString('pt-BR')}. Até lá, você pode
          cancelar e manter todos os seus dados.
        </Muted>
      </div>
      <Button
        variant='outline'
        className='w-fit'
        onClick={handleCancel}
        disabled={cancelDeletion.isPending}
      >
        Cancelar exclusão
      </Button>
    </div>
  )
}

function UserModalProfileDeleteAccount({
  pending,
  onConfirm,
}: {
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <div className='w-full mt-10 bg-card rounded-lg border-border px-4 py-3 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 md:gap-8'>
      <div className='flex-1 flex flex-col gap-1.5'>
        <H4 className='text-sm'>Desativar conta</H4>
        <Muted className='text-xs'>
          Ao desativar uma conta, todos os dados e recursos dessa conta serão
          removidos permanentemente e não poderão ser recuperados.
        </Muted>
      </div>
      <ConfirmDialog
        trigger={
          <Button variant='destructive' className='w-fit'>
            Desativar conta
          </Button>
        }
        title='Desativar conta'
        description='Todos os dados e recursos dessa conta serão removidos permanentemente e não poderão ser recuperados. Você será desconectado em seguida.'
        confirmLabel='Desativar conta'
        destructive
        pending={pending}
        onConfirm={onConfirm}
      />
    </div>
  )
}

function UserModalProfileForm({ user }: { user: UserDTO | undefined }) {
  const { refetch: refetchSession } = useCacheUser()

  const updateUser = useUpdateUser()
  const uploadAvatar = useUploadAvatar()

  const fieldId = useId()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')

  const dirty =
    name !== (user?.name ?? '') || username !== (user?.username ?? '')

  async function handleSave(e: React.SubmitEvent) {
    e.preventDefault()
    if (!dirty) return
    async function run() {
      await updateUser.mutateAsync({
        ...(name !== user?.name ? { name } : {}),
        ...(username !== user?.username ? { username } : {}),
      })
      await refetchSession?.()
    }
    await notify.run(run(), {
      loading: 'Salvando perfil...',
      success: 'Perfil atualizado',
      error: 'Erro ao salvar',
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const avatarFile = file
    async function run() {
      await uploadAvatar.mutateAsync(avatarFile)
      await refetchSession?.()
    }
    await notify.run(run(), {
      loading: 'Enviando avatar...',
      success: 'Avatar atualizado',
      error: 'Erro ao enviar avatar',
    })
  }

  return (
    <form className='w-full' onSubmit={handleSave}>
      <input
        ref={avatarInputRef}
        type='file'
        aria-label='Foto de perfil'
        accept='image/jpeg,image/png,image/webp'
        className='hidden'
        onChange={handleAvatarChange}
      />
      <div className='flex w-full flex-col gap-6'>
        <div className='relative h-44 w-full'>
          <Image
            src={user?.coverImage || '/coverImages/image_1.jpg'}
            alt=''
            fill
            sizes='(max-width: 768px) 100vw, 640px'
            className='object-cover object-center rounded-lg bg-card'
          />
          <button
            type='button'
            onClick={() => avatarInputRef?.current?.click()}
            className='absolute -bottom-6 left-6 rounded-full'
            aria-label='Alterar avatar'
          >
            <UserAvatar
              name={user?.name}
              image={user?.image}
              className='flex items-end justify-between size-16'
              fallbackClassName='text-lg'
            />
          </button>
          <div className='absolute bottom-3 right-3 flex'>
            <UserCoverImagePicker currentImage={user?.coverImage} />
          </div>
        </div>
        <div className='mt-6 flex flex-col'>
          <H4 className='text-lg'>{user?.name}</H4>
          <Muted className='text-sm text-muted-foreground'>{user?.email}</Muted>
        </div>
        <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-4'>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-name`}>
              Nome completo <span className='text-destructive'>*</span>
            </FieldLabel>
            <Input
              id={`${fieldId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!user}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-username`}>
              Nome de exibição <span className='text-destructive'>*</span>
            </FieldLabel>
            <Input
              id={`${fieldId}-username`}
              value={username}
              disabled={!user}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-email`}>
              E-mail <span className='text-destructive'>*</span>
            </FieldLabel>
            <Input id={`${fieldId}-email`} value={user?.email ?? ''} disabled />
            <FieldDescription>
              <Button type='button' variant='link' size='xs'>
                Alterar e-mail
              </Button>
            </FieldDescription>
          </Field>
        </FieldGroup>
        <Button
          type='submit'
          size='sm'
          className='w-fit'
          disabled={!dirty || updateUser.isPending}
        >
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}
