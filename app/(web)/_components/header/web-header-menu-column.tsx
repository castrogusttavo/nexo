import { Muted } from '@/components/typography/text/muted'
import { cn } from '@/lib/utils'
import { WebHeaderListItem } from './web-header-list-item'
import type { NavItemData } from './web-header-nav-data'

// One labelled list of links in a header mega menu.
export function WebHeaderMenuColumn({
  label,
  items,
  columns = 1,
  className,
}: {
  label: string
  items: NavItemData[]
  /** How many columns the links flow into. */
  columns?: 1 | 2
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Muted className='px-2'>{label}</Muted>
      <ul
        className={cn(
          'grid gap-4',
          columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        {items.map((item) => (
          <WebHeaderListItem
            key={item.title}
            title={item.title}
            href={item.href}
            icon={item.icon}
          >
            <span className='text-sm'>{item.description}</span>
          </WebHeaderListItem>
        ))}
      </ul>
    </div>
  )
}
