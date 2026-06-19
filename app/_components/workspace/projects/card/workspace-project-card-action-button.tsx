import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

interface ProjectCardActionsProps extends ComponentProps<typeof Button> {
  children: React.ReactNode
}

export function ProjectCardActions({
  children,
  ...props
}: ProjectCardActionsProps) {
  return (
    <Button
      className='flex h-7 w-7 items-center justify-center rounded-sm bg-black/30 dark:bg-white/30 text-zinc-900 dark:text-zinc-100'
      {...props}
    >
      {children}
    </Button>
  )
}
