import type { IconSvgElement } from '@hugeicons/react'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { NavigationMenuLink } from '@/components/ui/navigation-menu'

export function ListItem({
  title,
  children,
  href,
  icon,
  ...props
}: React.ComponentPropsWithoutRef<'li'> & {
  href: string
  icon?: IconSvgElement
}) {
  return (
    <li className='h-full' {...props}>
      <NavigationMenuLink
        className='h-full items-start'
        render={
          <Link href={href}>
            <div className='flex w-full flex-col gap-1 text-sm hover:text-branding-700 hover:dark:text-branding-400'>
              <div className='flex items-center gap-1.5'>
                {icon && <NexoIcon icon={icon} size={20} />}
                <div className='leading-none font-medium'>{title}</div>
              </div>
              <div className='line-clamp-2 text-muted-foreground'>
                {children}
              </div>
            </div>
          </Link>
        }
      />
    </li>
  )
}
