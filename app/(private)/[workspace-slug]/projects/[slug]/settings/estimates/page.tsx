import { MountainIcon } from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { ProjectEstimatesSettings } from './project-estimates-settings'

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string; slug: string }>

// The heading renders at once; the settings below need the project and wait
// inside the boundary.
export default function ProjectEstimatesPage({ params }: { params: Params }) {
  return (
    <div className='w-full'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Estimativas'}>
            <NexoIcon
              icon={MountainIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

async function Content({ params }: { params: Params }) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  return (
    <ProjectEstimatesSettings
      workspaceId={context.workspaceId}
      projectSlug={context.project.slug}
    />
  )
}
