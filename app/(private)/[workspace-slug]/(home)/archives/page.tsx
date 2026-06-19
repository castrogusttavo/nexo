import { Archive03Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { ArchivedProjectList } from '@/app/_components/workspace/projects/workspace-archived-project-list'
import { ProjectFilterButton } from '@/app/_components/workspace/projects/workspace-project-filter-button'
import { ProjectorderButton } from '@/app/_components/workspace/projects/workspace-project-order-button'
import { NexoIcon } from '@/components/icon/icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipRepository } from '@/src/repositories/membership.repository'

export const metadata: Metadata = {
  title: 'Arquivos | Nexo',
  description: 'Projetos arquivados do workspace.',
}

type Props = { params: Promise<{ 'workspace-slug': string }> }

export default async function ArchivesPage({ params }: Props) {
  const { 'workspace-slug': slug } = await params
  const session = await getAuthSession()
  if (!session.ok) notFound()

  const membership = await MembershipRepository.findByUserAndSlug(
    session.value.user.id,
    slug,
  )
  if (!membership.ok || !membership.value) notFound()

  const workspaceId = membership.value.workspace.id

  return (
    <div className='w-full overflow-y-scroll'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Arquivados'>
            <NexoIcon
              icon={Archive03Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <Tabs>
        <TabsList
          variant='line'
          className='w-full flex justify-between items-center min-h-12 border-b border-border px-5'
        >
          <div className='flex items-center gap-2.5'>
            <TabsTrigger
              value='projects'
              className='max-w-fit data-active:bg-secondary!'
            >
              Projetos
            </TabsTrigger>
          </div>
          <div className='flex items-center space-x-2'>
            <ProjectorderButton />
            <ProjectFilterButton />
          </div>
        </TabsList>
        <TabsContent value='projects'>
          <ArchivedProjectList workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
