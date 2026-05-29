import { PencilEdit01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { UserStickyCreateButton } from '@/app/_components/user/sticky/user-sticky-create-button'
import { UserStickyList } from '@/app/_components/user/sticky/user-sticky-list'
import { NexoIcon } from '@/components/icon/icon'

export const metadata: Metadata = {
  title: 'Stickies | Nexo',
  description: 'Suas anotações rápidas em um só lugar.',
}

export default function StickiesPage() {
  return (
    <div className='w-full overflow-y-scroll'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Stickies'}>
            <NexoIcon
              icon={PencilEdit01Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <UserStickyCreateButton
          variant='default'
          size='xs'
          label='Adicionar sticky'
        />
      </HeaderInternalNavigation>
      <div className='w-full p-6'>
        <UserStickyList />
      </div>
    </div>
  )
}
