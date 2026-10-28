import { Archive03Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { ProjectArchivedList } from '@/app/_components/workspace/project/project-archived-list'
import { ProjectFilterButton } from '@/app/_components/workspace/project/project-filter-button'
import { ProjectOrderButton } from '@/app/_components/workspace/project/project-order-button'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { NexoIcon } from '@/components/icon/icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireMembership } from '@/src/lib/dal'

export const metadata: Metadata = {
  title: 'Arquivos | Nexo',
  description: 'Projetos arquivados do workspace.',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string }>

// The heading and the tabs render at once; the archived list needs the
// workspace and waits inside the boundary.
export default function ArchivesPage({ params }: { params: Params }) {
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
            <ProjectOrderButton />
            <ProjectFilterButton />
          </div>
        </TabsList>
        <TabsContent value='projects'>
          <Suspense fallback={<PageSkeleton />}>
            <Archived params={params} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

async function Archived({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)
  return <ProjectArchivedList workspaceId={membership.workspaceId} />
}
