import { PencilEdit01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { WorkspaceProjectModal } from '@/app/_components/workspace/projects/modal/workspace-project-modal-create'
import { ProjectFilterButton } from '@/app/_components/workspace/projects/workspace-project-filter-button'
import { ProjectList } from '@/app/_components/workspace/projects/workspace-project-list'
import { ProjectorderButton } from '@/app/_components/workspace/projects/workspace-project-order-button'
import { NexoIcon } from '@/components/icon/icon'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipService } from '@/src/services/membership.service'

export const metadata: Metadata = {
  title: 'Projetos | Nexo',
  description: 'Gerencie os projetos do seu workspace.',
}

type Props = { params: Promise<{ 'workspace-slug': string }> }

export default async function ProjectsPage({ params }: Props) {
  const { 'workspace-slug': slug } = await params
  const session = await getAuthSession()
  if (!session.ok) notFound()

  const membership = await MembershipService.getByUserAndSlug(
    session.value.user.id,
    slug,
  )
  if (!membership.ok || !membership.value) notFound()

  const workspaceId = membership.value.workspace.id

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
          <ProjectorderButton />
          <ProjectFilterButton />
          <WorkspaceProjectModal workspaceId={workspaceId} />
        </div>
      </HeaderInternalNavigation>
      <ProjectList workspaceId={workspaceId} workspaceSlug={slug} />
    </div>
  )
}
