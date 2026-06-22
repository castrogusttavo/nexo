'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/src/lib/auth-client'

interface OnboardingUserButtonProps {
  name: string | null
  email: string
  image: string | null
  initials: string
}

export function OnboardingUserButton({
  name,
  email,
  image,
  initials,
}: OnboardingUserButtonProps) {
  const { push } = useRouter()

  async function handleWrongEmail() {
    await authClient.signOut()
    push('/sign-in')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant='ghost'>
            <Avatar size='sm'>
              <AvatarImage src={image ?? ''} alt={name ?? email} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {name ?? email}
          </Button>
        }
      />
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem
          onClick={handleWrongEmail}
          variant='destructive'
          className='text-xs'
        >
          E-mail incorreto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
