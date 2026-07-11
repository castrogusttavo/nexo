'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TabsContent } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import { getInitials } from '@/lib/user-name-initials'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import {
  useDeleteAccount,
  useUpdateUser,
  useUploadAvatar,
  useUser,
} from '@/src/hooks/use-user'
import { authClient } from '@/src/lib/auth-client'
import { UserCoverImagePicker } from '../user-modal-coverimage-dialog'

export function UserModalProfileTab({ tab }: { tab: string }) {
  const { data: user } = useUser()
  const { refetch: refetchSession } = useCacheUser()

  const updateUser = useUpdateUser()
  const uploadAvatar = useUploadAvatar()
  const deleteAccount = useDeleteAccount()

  const router = useRouter()

  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')

  const dirty =
    name !== (user?.name ?? '') || username !== (user?.username ?? '')

  async function handleSave(e: React.SubmitEvent) {
    e.preventDefault()
    if (!dirty) return
    try {
      await updateUser.mutateAsync({
        ...(name !== user?.name ? { name } : {}),
        ...(username !== user?.username ? { username } : {}),
      })
      await refetchSession?.()
      notify.success('Perfil atualizado')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Erro ao salvar')
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await uploadAvatar.mutateAsync(file)
      await refetchSession?.()
      notify.success('Avatar autalizado')
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Erro ao enviar avatar',
      )
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount.mutateAsync()
      await authClient.signOut()
      notify.success('Conta desativada. Você será desconectado.')
      router.push('/sign-in')
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Erro ao desativar conta',
      )
    }
  }

  return (
    <TabsContent value={tab}>
      <form key={user?.id} className='w-full' onSubmit={handleSave}>
        <input
          ref={avatarInputRef}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          className='hidden'
          onChange={handleAvatarChange}
        />
        <div className='flex w-full flex-col gap-6'>
          <div className='relative h-44 w-full'>
            <img
              src={user?.coverImage || '/coverImages/image_1.jpg'}
              alt=''
              className='object-cover object-center w-full h-full rounded-lg bg-card'
            />
            <button
              type='button'
              onClick={() => avatarInputRef?.current?.click()}
              className='absolute -bottom-6 left-6 rounded-full'
              aria-label='Alterar avatar'
            >
              <Avatar className='flex items-end justify-between size-16'>
                <AvatarImage src={user?.image || ''} alt={user?.name} />
                <AvatarFallback className='text-lg'>
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className='absolute bottom-3 right-3 flex'>
              <UserCoverImagePicker currentImage={user?.coverImage} />
            </div>
          </div>
          <div className='mt-6 flex flex-col'>
            <H4 className='text-lg'>{user?.name}</H4>
            <Muted className='text-sm text-muted-foreground'>
              {user?.email}
            </Muted>
          </div>
          <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-4'>
            <Field>
              <FieldLabel>
                Nome completo <span className='text-destructive'>*</span>
              </FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>
                Nome de exibição <span className='text-destructive'>*</span>
              </FieldLabel>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>
                E-mail <span className='text-destructive'>*</span>
              </FieldLabel>
              <Input value={user?.email} disabled />
              <FieldDescription>
                <Button variant='link' size='xs'>
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
            {updateUser.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
      <div className='w-full mt-10 bg-card rounded-lg border-border px-4 py-3 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 md:gap-8'>
        <div className='flex-1 flex flex-col gap-1.5'>
          <H4 className='text-sm'>Desativar conta</H4>
          <Muted className='text-xs'>
            Ao desativar uma conta, todos os dados e recursos dessa conta serão
            removidos permanentemente e não poderão ser recuperados.
          </Muted>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant='destructive' className='w-fit'>
                Desativar conta
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar conta</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os dados e recursos dessa conta serão remotivos
                permanentemente e não poderão ser recuperados. Você será
                desconectado em seguida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteAccount.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant='destructive'
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending ? 'Desativando...' : 'Desativar conta'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TabsContent>
  )
}
