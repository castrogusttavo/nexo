'use client'

import { AvatarGroup } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/user-avatar'
import { NO_LEAD_NAME } from '@/lib/removed-user'
import { useCacheUser } from '@/src/hooks/cache/use-user'

interface WorkspaceProjectCardMembersProps {
  leadId: string | null
}

export function WorkspaceProjectCardMembers({
  leadId,
}: WorkspaceProjectCardMembersProps) {
  const { data: session } = useCacheUser()
  // A project whose lead was deleted keeps no lead at all.
  const hasLead = leadId !== null
  const isCurrentUser = hasLead && session?.user.id === leadId

  const name = isCurrentUser ? (session?.user.name ?? '') : ''
  const label = hasLead ? name || 'Membro' : NO_LEAD_NAME

  return (
    <AvatarGroup className='grayscale-75'>
      <Tooltip>
        <TooltipTrigger
          render={
            <UserAvatar
              size='sm'
              name={name}
              image={isCurrentUser ? session?.user.image : null}
              fallback={name ? undefined : hasLead ? '??' : '—'}
              className='cursor-default'
            />
          }
        />
        <TooltipContent side='bottom'>{label}</TooltipContent>
      </Tooltip>
    </AvatarGroup>
  )
}
