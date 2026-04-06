import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

interface ShortCutButtonProps extends ComponentProps<typeof Button> {
  children?: React.ReactNode
}

export function ShortCutButton({ children, ...rest }: ShortCutButtonProps) {
  return (
    <Button variant='ghost' {...rest}>
      {children}
    </Button>
  )
}
