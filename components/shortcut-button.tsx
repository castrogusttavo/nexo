import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ShortCutButtonProps {
  children?: React.ReactNode
  href?: string
}

export function ShortCutButton({ children, href }: ShortCutButtonProps) {
  return (
    <Button variant='ghost' size='icon-sm'>
      <Link href={href ?? '#'}>
        {children}
      </Link>
    </Button>
  )
}
