'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitials } from '@/lib/user-name-initials'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { authClient } from '@/src/lib/auth-client'

export function WebHeaderUpgrade() {
  const { push } = useRouter()
  const { data: session, isPending } = useCacheUser()

  if (isPending || !session) return <Skeleton className='min-h-12 w-full' />

  const { name, email, image } = session.user
  const initials = getInitials(name)

  async function handleWrongEmail() {
    await authClient.signOut()
    push('/sign-in')
  }

  return (
    <header className='flex items-center justify-between border-b border-border px-6 py-4 sm:py-0 min-h-12'>
      <Link href='/' className='justify-self-start'>
        <Image src='/brand/logo.svg' alt='nexo-logo' width={95} height={35} />
      </Link>
      <div className='flex items-center gap-1'>
        <Link href='/talk-to-sales'>
          <Button variant='link' size='sm' className='text-muted-foreground'>
            Falar com vendas
          </Button>
        </Link>
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
      </div>
    </header>
  )
}
