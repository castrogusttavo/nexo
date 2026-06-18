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
import { useCacheUser } from '@/src/hooks/cache/use-user'

interface ProjectCardMembersProps {
  leadId: string
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
  const isCurrentUser = session?.user.id === leadId

  const name = isCurrentUser ? (session?.user.name ?? '') : ''

  return (
    <AvatarGroup className='grayscale-75'>
      <Tooltip>
        <TooltipTrigger
          render={<Avatar size='sm' className='cursor-default' />}
        >
          {isCurrentUser && session?.user.image ? (
            <AvatarImage src={session.user.image} alt={name} />
          ) : null}
          <AvatarFallback>{name ? nameInitials(name) : '??'}</AvatarFallback>
        </TooltipTrigger>
        <TooltipContent side='bottom'>{name || 'Membro'}</TooltipContent>
      </Tooltip>
    </AvatarGroup>
  )
}
