'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NO_LEAD_NAME } from '@/lib/removed-user'
import { useCacheUser } from '@/src/hooks/cache/use-user'

interface ProjectCardMembersProps {
  leadId: string | null
}

function nameInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function ProjectCardMembers({ leadId }: ProjectCardMembersProps) {
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
          render={<Avatar size='sm' className='cursor-default' />}
        >
          {isCurrentUser && session?.user.image ? (
            <AvatarImage src={session.user.image} alt={name} />
          ) : null}
          <AvatarFallback>
            {name ? nameInitials(name) : hasLead ? '??' : '—'}
          </AvatarFallback>
        </TooltipTrigger>
        <TooltipContent side='bottom'>{label}</TooltipContent>
      </Tooltip>
    </AvatarGroup>
  )
}
