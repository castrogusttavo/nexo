'use client'

import {
  Logout05Icon,
  PreferenceHorizontalIcon,
  Settings01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { authClient } from '@/src/lib/auth-client'
import { NexoIcon } from '../../../components/icon/icon'
import { H4 } from '../../../components/typography/heading/h4'
import { Muted } from '../../../components/typography/text/muted'

export function UserDropdownProfile() {
  const router = useRouter()
  const { data: user } = useCacheUser()

  async function handleSubmit() {
    await authClient.signOut()
    router.push('/sign-in')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className='data-popup-open:bg-muted dark:data-popup-open:bg-muted p-1 rounded-md'
          >
            <Avatar className='rounded-full size-6'>
              <AvatarImage src={user?.user.image || ''} alt={user?.user.name} />
              <AvatarFallback>{user?.user.name[0]}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className='w-72 p-3 flex flex-col gap-y-3 rounded-md'>
        <DropdownMenuGroup className='rounded-lg relative h-29 w-full'>
          <div className='absolute inset-0 bg-black/25' />
          <Image
            width={262}
            height={116}
            src={'/images/bg-1.jpg'}
            alt={'background'}
            className='object-cover h-29 w-full rounded-lg'
          />
          <div className='flex flex-col gap-y-1 items-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
            <Avatar className='rounded-full size-12'>
              <AvatarImage src={user?.user.image || ''} alt={user?.user.name} />
              <AvatarFallback>{user?.user.name[0]}</AvatarFallback>
            </Avatar>
            <H4 className='text-sm'>{user?.user.name}</H4>
            <Muted className='text-xs text-primary'>{user?.user.email}</Muted>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuGroup className='flex flex-col'>
          <DropdownMenuItem className='text-xs'>
            <NexoIcon icon={Settings01Icon} />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem className='text-xs'>
            <NexoIcon icon={PreferenceHorizontalIcon} />
            Preferências
          </DropdownMenuItem>
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
  )
}
