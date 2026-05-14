import {
  Link02Icon,
  MoreVerticalCircle01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

interface LinkProps {
  href: string
  title: string
  daysAgo: string
}

export function ShortcutLink({ href, title, daysAgo }: LinkProps) {
  return (
    <Link
      href={href}
      className='group min-h-[56px] w-[230px] flex justify-between items-center px-4 border border-border rounded-md'
    >
      <div className='flex items-center gap-2'>
        <div className='size-8 rounded-sm p-2 bg-secondary'>
          <NexoIcon icon={Link02Icon} />
        </div>
        <div>
          <Muted className='text-primary'>{title}</Muted>
          <Muted className='text-[0.75rem]'>{daysAgo} dias atrás</Muted>
        </div>
      </div>
      <div>
        <Button
          size='icon-xs'
          variant='ghost'
          className='hidden group-hover:flex'
        >
          <NexoIcon icon={MoreVerticalCircle01Icon} />
        </Button>
      </div>
    </Link>
  )
}
