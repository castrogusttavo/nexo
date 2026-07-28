import { BlocksIcon } from '@hugeicons-pro/core-stroke-rounded'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { FeatureToggleSettings } from '../feature-toggle-settings'

export default async function ProjectModulesSettingsPage({
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
          <HeaderBreadcrumbCrumb title='Módulos'>
            <NexoIcon
              icon={BlocksIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <FeatureToggleSettings
        workspaceId={context.workspaceId}
        projectSlug={context.project.slug}
        field='modulesEnabled'
        title='Módulos'
        description='Organize o trabalho em subprojetos com líderes e responsáveis dedicados.'
        toggleLabel='Ativar módulos'
        toggleDescription='Os membros do projeto podem criar e editar módulos.'
      />
    </div>
  )
}
