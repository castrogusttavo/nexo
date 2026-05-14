import { PencilEdit01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Stickies | Nexo',
  description: 'Suas anotações rápidas em um só lugar.',
}

export default function StickiesPage() {
  return (
    <div className='w-full'>
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
        <Button variant='default' size='xs'>
          Adicionar sticky
        </Button>
      </HeaderInternalNavigation>
    </div>
  )
}
