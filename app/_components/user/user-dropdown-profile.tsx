'use client'

import { Logout05Icon } from '@hugeicons-pro/core-stroke-rounded'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/user-avatar'
import { useUser } from '@/src/hooks/use-user'
import { authClient } from '@/src/lib/auth-client'
import {
  type ProfileTab,
  profileTriggers,
  UserModalCustomProfile,
} from './modal/user-modal-custom-profile'

export function UserDropdownProfile() {
  const { push } = useRouter()
  const { data: user } = useUser()
  const [modalTab, setModalTab] = useState<ProfileTab | null>(null)

  async function handleSubmit() {
    await authClient.signOut()
    push('/sign-in')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              size='icon'
              aria-label='Menu do perfil'
              className='data-popup-open:bg-muted dark:data-popup-open:bg-muted p-1 rounded-md'
            >
              <UserAvatar
                name={user?.name}
                image={user?.image}
                className='size-6'
              />
            </Button>
          }
        />
        <DropdownMenuContent className='w-72 p-3 flex flex-col gap-y-3 rounded-md'>
          <DropdownMenuGroup className='rounded-lg relative h-29 w-full'>
            <div className='absolute inset-0 bg-black/25 rounded-lg' />
            <Image
              src={user?.coverImage || '/coverImages/image_1.jpg'}
              alt='background'
              fill
              sizes='288px'
              className='object-center object-cover rounded-lg brightness-55'
            />
            <div className='flex flex-col gap-y-1 items-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
              <UserAvatar
                name={user?.name}
                image={user?.image}
                className='size-12'
              />
              <H4 className='text-sm'>{user?.name}</H4>
              <Muted className='text-xs text-primary'>{user?.email}</Muted>
            </div>
          </DropdownMenuGroup>
          <DropdownMenuGroup className='flex flex-col'>
            {(
              Object.entries(profileTriggers) as [
                ProfileTab,
                (typeof profileTriggers)[keyof typeof profileTriggers],
              ][]
            ).map(([tab, { name, icon }]) => (
              <DropdownMenuItem
                key={tab}
                className='text-xs'
                onClick={() => setModalTab(tab)}
              >
                <NexoIcon icon={icon} />
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={handleSubmit}
              variant={'destructive'}
              className='text-xs'
            >
              <NexoIcon icon={Logout05Icon} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserModalCustomProfile
        tab={modalTab}
        onOpenChange={(open) => {
          if (!open) setModalTab(null)
        }}
      />
    </>
  )
}
