'use client'

import Image from 'next/image'
import Link from 'next/link'
import { HeaderWrongEmailMenu } from '@/app/_components/header/header-wrong-email-menu'
import { ButtonLink } from '@/components/button-link'
import { Skeleton } from '@/components/ui/skeleton'
import { useCacheUser } from '@/src/hooks/cache/use-user'

export function WebHeaderUpgrade() {
  const { data: session, isPending } = useCacheUser()

  if (isPending || !session) return <Skeleton className='min-h-12 w-full' />

  const { name, email, image } = session.user

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
        <HeaderWrongEmailMenu name={name} email={email} image={image} />
      </div>
    </header>
  )
}
