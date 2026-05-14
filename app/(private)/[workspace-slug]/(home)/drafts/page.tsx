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
  title: 'Rascunhos | Nexo',
  description: 'Seus itens de trabalho em rascunho.',
}

export default function DraftsPage() {
  return (
    <div className='w-full'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Rascunhos'}>
            <NexoIcon
              icon={PencilEdit01Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <Button variant='default' size='xs'>
          Rascunhar um item de trabalho
        </Button>
      </HeaderInternalNavigation>
    </div>
  )
}
