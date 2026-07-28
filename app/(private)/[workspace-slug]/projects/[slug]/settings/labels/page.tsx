import { Tag01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { ProjectLabelsSettings } from './project-labels-settings'

export default async function ProjectLabelsPage({
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
          <HeaderBreadcrumbCrumb title={'Etiquetas'}>
            <NexoIcon
              icon={Tag01Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <ProjectLabelsSettings
        workspaceId={context.workspaceId}
        projectSlug={context.project.slug}
      />
    </div>
  )
}
