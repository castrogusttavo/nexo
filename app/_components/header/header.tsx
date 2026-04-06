'use client'

import { InboxIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useRouter } from 'next/navigation'
import { NexoIcon } from '@/app/_components/icon/icon'
import { ShortCutButton } from '@/app/_components/shortcut-button'
import { Profile } from '@/app/_components/user/profile'

export function Header() {
  const router = useRouter()

  return (
    <div className='w-full flex justify-end py-1 px-2'>
      <ShortCutButton onClick={() => router.push('/inbox')}>
        <NexoIcon icon={InboxIcon} strokeWidth={2} size={20} />
      </ShortCutButton>
      <Profile />
    </div>
  )
}
