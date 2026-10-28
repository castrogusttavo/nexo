'use client'

import { Activity02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
// import type { Metadata } from 'next'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { DetailsPanelToggle } from '@/components/layouts/details-panel'
import { PROJECT_DETAILS_ID, ProjectDetails } from './project-details'

// export const metadata: Metadata = {
//   title: 'Overview - Project | Nexo',
//   description: 'Gerencie os projetos do seu workspace.',
// }

export default function ProjectsPage() {
  const [detailsOpen, setDetailsOpen] = useState(true)

  return (
    <div className='w-full h-full overflow-y-scroll no-scrollbar'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Visão geral'}>
            <NexoIcon
              icon={Activity02Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <DetailsPanelToggle
          panelId={PROJECT_DETAILS_ID}
          open={detailsOpen}
          onToggle={() => setDetailsOpen((open) => !open)}
        />
      </HeaderInternalNavigation>
      <div className='w-full flex items-start justify-between h-full'>
        <div className='flex-1'>nome</div>
        <ProjectDetails open={detailsOpen} />
      </div>
    </div>
  )
}
