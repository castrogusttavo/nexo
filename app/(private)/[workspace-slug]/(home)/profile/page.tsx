import { UserLove01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'

export const metadata: Metadata = {
  title: 'Seu trabalho | Nexo',
  description: 'Acompanhe os itens de trabalho atribuídos a você.',
}

export default function ProfilePage() {
  return (
    <div className='w-full'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Seu trabalho'}>
            <NexoIcon
              icon={UserLove01Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
    </div>
  )
}
