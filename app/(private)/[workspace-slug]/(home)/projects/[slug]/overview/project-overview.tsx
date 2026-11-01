'use client'

import { Activity02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { DetailsPanelToggle } from '@/components/layouts/details-panel'
import { Muted } from '@/components/typography/text/muted'
import { PROJECT_DETAILS_ID, ProjectDetails } from './project-details'

export function ProjectOverview({
  workspaceId,
  projectSlug,
  canManage,
  projectStatesEnabled,
}: {
  workspaceId: string
  projectSlug: string
  canManage: boolean
  projectStatesEnabled: boolean
}) {
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
        <div className='flex-1'>
          {/* Cover + emoji projeto */}
          <div />
          {/* Documento editável (estilo wiki) + reaction + link|anexo */}
          <div />
          <div />
          <hr className='bg-muted' />
          {/* Progresso bar for issues */}
          <div>
            <Muted>Progresso</Muted>
            <div>
              {/* line com divisão real com base na proporção */}
              <div>
                <div>
                  <div />
                  <span>Backlog</span>
                </div>
                <div>
                  <span>3</span>
                  <span>43%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ProjectDetails
          open={detailsOpen}
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          canManage={canManage}
          projectStatesEnabled={projectStatesEnabled}
        />
      </div>
    </div>
  )
}
