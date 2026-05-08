import type { ComponentProps } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

export function NavAction({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  icon: IconType
}) {
  return (
    <Button
      variant='ghost'
      size='default'
      {...props}
      className={cn('w-full justify-start text-muted-foreground', className)}
    >
      <NexoIcon icon={icon} strokeWidth={2} />
      {children}
    </Button>
  )
}
