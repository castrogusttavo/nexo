import {
  Link02Icon,
  MoreVerticalCircle01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', {
  numeric: 'auto',
})

function formatRelativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const seconds = Math.round(diffMs / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)
  const months = Math.round(days / 30)
  const years = Math.round(months / 365)

  if (Math.abs(years) >= 1) return relativeTimeFormatter.format(years, 'year')
  if (Math.abs(months) >= 1)
    return relativeTimeFormatter.format(months, 'month')
  if (Math.abs(days) >= 1) return relativeTimeFormatter.format(days, 'day')
  if (Math.abs(hours) >= 1) return relativeTimeFormatter.format(hours, 'hour')
  if (Math.abs(minutes) >= 1)
    return relativeTimeFormatter.format(minutes, 'minute')

  return relativeTimeFormatter.format(seconds, 'second')
}

interface LinkProps {
  title: string
  url: string
  createdAt: string
}

export function UserShortcutLink({ title, url, createdAt }: LinkProps) {
  return (
    <a
      href={url}
      rel='noopener noreferrer'
      className='group min-h-14 w-57.5 flex justify-between items-center px-4 border border-border rounded-md'
    >
      <div className='flex items-center gap-2'>
        <div className='size-8 rounded-sm p-2 bg-secondary'>
          <NexoIcon icon={Link02Icon} />
        </div>
        <div>
          <Muted className='text-primary'>{title}</Muted>
          <Muted className='text-[0.75rem]'>
            {formatRelativeTime(createdAt)}
          </Muted>
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
    </a>
  )
}
