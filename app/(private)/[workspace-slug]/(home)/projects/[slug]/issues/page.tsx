import { KeyframesDoubleIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { IssueListView } from '@/app/_components/issue/issue-list-view'
import { IssueProjectSwitcher } from '@/app/_components/issue/issue-project-switcher'
import { IssueModal } from '@/app/_components/issue/modal/issue-modal'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getProjectContext } from '@/src/lib/project-context'
import { IssueService } from '@/src/services/issue.service'
import { IssuesFilters } from './filters'
import { IssueLayoutToggle } from './issue-layout-toggle'

export const metadata: Metadata = {
  title: 'Issues | Nexo',
  description: '',
}

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ 'workspace-slug': string; slug: string }>
  searchParams: Promise<{ layout?: string }>
}) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const { layout } = await searchParams
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  const issuesResult = await IssueService.list(
    context.userId,
    context.workspaceId,
    context.project.slug,
  )
  const issueCount = issuesResult.ok ? issuesResult.value.length : 0

  return (
    <div className='w-full h-full overflow-y-scroll no-scrollbar'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb>
            <IssueProjectSwitcher
              workspaceId={context.workspaceId}
              workspaceSlug={workspaceSlug}
              projectSlug={context.project.slug}
              buttonVariant='ghost'
            />
          </HeaderBreadcrumbCrumb>
          <HeaderBreadcrumbCrumb
            title={'Issues'}
            after={<Badge variant='info'>{issueCount}</Badge>}
          >
            <NexoIcon
              icon={KeyframesDoubleIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
        <div className='flex items-center gap-2'>
          <IssueLayoutToggle />
          <IssuesFilters />
          <IssueModal
            trigger={
              <Button size='sm' className='h-8'>
                Adicionar issue
              </Button>
            }
            workspaceId={context.workspaceId}
            workspaceSlug={workspaceSlug}
            projectSlug={context.project.slug}
          />
        </div>
      </HeaderInternalNavigation>
      <div>
        {!layout || layout === 'list' ? (
          <IssueListView
            workspaceId={context.workspaceId}
            workspaceSlug={workspaceSlug}
            projectSlug={context.project.slug}
            projectIdentifier={context.project.identifier}
          />
        ) : (
          <div className='p-6 text-muted-foreground text-sm'>
            Layout em breve.
          </div>
        )}
      </div>
    </div>
  )
}
