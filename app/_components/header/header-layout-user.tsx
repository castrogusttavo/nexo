'use client'

import { InboxIcon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { ShortCutButton } from '@/components/shortcut-button'
import { Button } from '@/components/ui/button'
import { UserDropdownHelper } from '../user/user-dropdown-helper'
import { UserDropdownProfile } from '../user/user-dropdown-profile'
import { WorkSpaceDropdown } from '../workspace/workspace-dropdown/workspace-dropdown-selector'

export function UserHeader({ slug }: { slug: string }) {
  return (
    <div className='w-full flex justify-between items-center px-3.5'>
      <WorkSpaceDropdown currentSlug={slug} />
      <div className='flex items-center gap-1'>
        <Link href={`/${slug}/get-started`}>
          <Button size='xs' variant='outline'>
            Comece agora
          </Button>
        </Link>
        <ShortCutButton href={`/${slug}/inbox`}>
          <NexoIcon icon={InboxIcon} strokeWidth={2} size={20} />
        </ShortCutButton>
        <UserDropdownHelper />
        <UserDropdownProfile />
      </div>
    </div>
  )
}
