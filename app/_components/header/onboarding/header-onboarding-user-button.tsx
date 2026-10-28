'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/user-avatar'
import { authClient } from '@/src/lib/auth-client'

interface HeaderOnboardingUserButtonProps {
  name: string | null
  email: string
  image: string | null
}

export function HeaderOnboardingUserButton({
  name,
  email,
  image,
}: HeaderOnboardingUserButtonProps) {
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
            <UserAvatar size='sm' name={name ?? email} image={image} />
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
