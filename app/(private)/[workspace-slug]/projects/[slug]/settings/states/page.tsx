import { StatusIcon } from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { ProjectStatesSettings } from './projec-states-settings'

export default async function ProjectStatesPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string; slug: string }>
}) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  return (
    <div className='w-full'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Estados'}>
            <NexoIcon
              icon={StatusIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <ProjectStatesSettings
        workspaceId={context.workspaceId}
        projectSlug={context.project.slug}
      />
    </div>
  )
}
