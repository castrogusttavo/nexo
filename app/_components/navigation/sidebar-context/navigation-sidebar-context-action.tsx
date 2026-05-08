import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

export function ContextPrimaryAction({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button {...props} variant='outline' className='w-full justify-start'>
      {children}
    </Button>
  )
}
