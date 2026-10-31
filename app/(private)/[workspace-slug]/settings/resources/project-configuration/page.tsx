import { FullScreenIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { NexoIcon } from '@/components/icon/icon'
import { requireMembership } from '@/src/lib/dal'
import { WorkspaceSettingsProjectConfiguration } from './workspace-settings-project-configuration'

export const metadata: Metadata = {
  title: 'Projetos | Nexo',
  description: 'Estados e etiquetas dos projetos do workspace',
}

export const instant = true

type Params = Promise<{ 'workspace-slug': string }>

async function ProjectConfiguration({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)

  return (
    <WorkspaceSettingsProjectConfiguration
      workspace={membership.workspace}
      role={membership.role}
    />
  )
}

export default function Page({ params }: { params: Params }) {
  return (
    <div className='w-full h-full overflow-y-auto'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Projetos'>
            <NexoIcon
              icon={FullScreenIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <Suspense fallback={<PageSkeleton />}>
        <ProjectConfiguration params={params} />
      </Suspense>
    </div>
  )
}
