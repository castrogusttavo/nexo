import { Progress03Icon } from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { FeatureToggleSettings } from '../feature-toggle-settings'

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string; slug: string }>

// The heading renders at once; the settings below need the project and wait
// inside the boundary.
export default function ProjectCyclesSettingsPage({
  params,
}: {
  params: Params
}) {
  return (
    <div className='w-full'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Ciclos'>
            <NexoIcon
              icon={Progress03Icon}
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
    <FeatureToggleSettings
      workspaceId={context.workspaceId}
      projectSlug={context.project.slug}
      field='cyclesEnabled'
      title='Ciclos'
      description='Agende o trabalho em períodos flexíveis que se adaptam ao ritmo e ao tempo únicos deste projeto.'
      toggleLabel='Ativar ciclos'
      toggleDescription='Planeje o trabalho em períodos de tempo focados.'
    />
  )
}
