'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ButtonLink } from '@/components/button-link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/user-avatar'
import { useCacheUser } from '@/src/hooks/cache/use-user'
import { authClient } from '@/src/lib/auth-client'

export function WebHeaderUpgrade() {
  const { push } = useRouter()
  const { data: session, isPending } = useCacheUser()

  if (isPending || !session) return <Skeleton className='min-h-12 w-full' />

  const { name, email, image } = session.user

  async function handleWrongEmail() {
    await authClient.signOut()
    push('/sign-in')
  }

  return (
    <header className='flex items-center justify-between border-b border-border px-6 py-4 sm:py-0 min-h-12'>
      <Link href='/' className='justify-self-start'>
        <Image
          src='/brand/logo.svg'
          alt='nexo-logo'
          width={95}
          height={35}
          className='invert dark:invert-0'
        />
      </Link>
      <div className='flex items-center gap-1'>
        <ButtonLink
          href='/talk-to-sales'
          variant='link'
          size='sm'
          className='text-muted-foreground'
        >
          Falar com vendas
        </ButtonLink>
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
      </div>
    </header>
  )
}
