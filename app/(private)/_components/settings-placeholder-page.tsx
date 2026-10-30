import type { ComponentProps } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { SettingsPage } from './settings-page'

// A settings section that is linked from the sidebar before it is built. It
// keeps the link from ending in a 404; replace the page, not this component,
// when the section ships.
export function SettingsPlaceholderPage({
  title,
  icon,
}: {
  title: string
  icon: ComponentProps<typeof NexoIcon>['icon']
}) {
  return (
    <div className='w-full h-full flex flex-col overflow-hidden'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={title}>
            <NexoIcon icon={icon} strokeWidth={2} className='text-primary' />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <SettingsPage title={title}>
        <Muted>Esta seção estará disponível em breve.</Muted>
      </SettingsPage>
    </div>
  )
}
