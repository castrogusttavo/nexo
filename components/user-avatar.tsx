import type { ComponentProps, ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/user-name-initials'

type UserAvatarProps = Omit<ComponentProps<typeof Avatar>, 'children'> & {
  /** Names the image and seeds the initials; an email works too. */
  name?: string | null
  image?: string | null
  /** Replaces the initials, e.g. a placeholder for an unknown person. */
  fallback?: ReactNode
  fallbackClassName?: string
}

// A person's avatar everywhere in the app: the photo when there is one,
// their initials otherwise. Extra props reach the Avatar root, so it also
// works as a trigger's `render` element.
export function UserAvatar({
  name,
  image,
  fallback,
  fallbackClassName,
  ...props
}: UserAvatarProps) {
  return (
    <Avatar {...props}>
      {image ? <AvatarImage src={image} alt={name ?? ''} /> : null}
      <AvatarFallback className={fallbackClassName}>
        {fallback ?? getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
