import { PencilEdit01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { WorkspaceProjectCreateDialog } from '@/app/_components/workspace/projects/modal/workspace-project-create-dialog'
import { WorkspaceProjectFilterButton } from '@/app/_components/workspace/projects/workspace-project-filter-button'
import { WorkspaceProjectList } from '@/app/_components/workspace/projects/workspace-project-list'
import { WorkspaceProjectOrderButton } from '@/app/_components/workspace/projects/workspace-project-order-button'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { NexoIcon } from '@/components/icon/icon'
import { requireMembership } from '@/src/lib/dal'

export const metadata: Metadata = {
  title: 'Projetos | Nexo',
  description: 'Gerencie os projetos do seu workspace.',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string }>

// The heading and the sort/filter buttons render at once; the create button
// and the list need the workspace and wait inside their boundaries.
export default function ProjectsPage({ params }: { params: Params }) {
  return (
    <div className='w-full overflow-y-scroll'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Projetos'>
            <NexoIcon
              icon={PencilEdit01Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <div className='flex items-center space-x-2'>
          <WorkspaceProjectOrderButton />
          <WorkspaceProjectFilterButton />
          <Suspense fallback={null}>
            <CreateProject params={params} />
          </Suspense>
        </div>
      </HeaderInternalNavigation>
      <Suspense fallback={<PageSkeleton />}>
        <Projects params={params} />
      </Suspense>
    </div>
  )
}

async function CreateProject({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)
  return <WorkspaceProjectCreateDialog workspaceId={membership.workspaceId} />
}

async function Projects({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)
  return (
    <WorkspaceProjectList
      workspaceId={membership.workspaceId}
      workspaceSlug={slug}
    />
  )
}
