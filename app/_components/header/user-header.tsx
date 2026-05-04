'use client'

import { InboxIcon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { ShortCutButton } from '@/components/shortcut-button'
import { Button } from '@/components/ui/button'
import { UserDropdownHelper } from '../user/user-dropdown-helper'
import { UserDropdownProfile } from '../user/user-dropdown-profile'
import { WorkSpaceDropdown } from '../workspace/workspace-dropdown'

export function UserHeader() {
  return (
    <div className='w-full flex justify-between items-center'>
      <WorkSpaceDropdown />
      <div className='flex items-center gap-1'>
        <Link href='/get-started'>
          <Button size='xs' variant='outline'>
            Comece agora
          </Button>
        </Link>
        <ShortCutButton href='/inbox'>
          <NexoIcon icon={InboxIcon} strokeWidth={2} size={20} />
        </ShortCutButton>
        <UserDropdownHelper />
        <UserDropdownProfile />
      </div>
    </div>
  )
}
