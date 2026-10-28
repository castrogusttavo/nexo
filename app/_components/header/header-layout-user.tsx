'use client'

import { InboxIcon } from '@hugeicons-pro/core-stroke-rounded'
import { ButtonLink } from '@/components/button-link'
import { NexoIcon } from '@/components/icon/icon'
import { ShortCutButton } from '@/components/shortcut-button'
import { UserDropdownHelper } from '../user/user-dropdown-helper'
import { UserDropdownProfile } from '../user/user-dropdown-profile'
import { WorkspaceDropdownSelector } from '../workspace/workspace-dropdown/workspace-dropdown-selector'

export function HeaderLayoutUser({ slug }: { slug: string }) {
  return (
    <div className='w-full flex justify-between items-center px-3.5'>
      <WorkspaceDropdownSelector currentSlug={slug} />
      <div className='flex items-center gap-1'>
        <ButtonLink href={`/${slug}/get-started`} size='xs' variant='outline'>
          Comece agora
        </ButtonLink>
        <ShortCutButton href={`/${slug}/inbox`} label='Caixa de entrada'>
          <NexoIcon icon={InboxIcon} strokeWidth={2} size={20} />
        </ShortCutButton>
        <UserDropdownHelper />
        <UserDropdownProfile />
      </div>
    </div>
  )
}
