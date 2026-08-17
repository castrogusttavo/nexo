import { KeyframesMultipleAddIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { IssueProjectSwitcher } from '@/app/_components/issue/issue-project-switcher'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { IssueService } from '@/src/services/issue.service'

export const metadata: Metadata = {
  title: 'Issues | Nexo',
  description: '',
}

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{
    'workspace-slug': string
    slug: string
    issueIdentifier: string
  }>
}) {
  const {
    'workspace-slug': workspaceSlug,
    slug,
    issueIdentifier,
  } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  const issueResult = await IssueService.getByIdentifier(
    context.userId,
    context.workspaceId,
    slug,
    issueIdentifier,
  )
  if (!issueResult.ok) notFound()

  const issue = issueResult.value
  const displayIdentifier = `${context.project.identifier}-${issue.number}`

  return (
    <div className='w-full overflow-y-scroll'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb>
            <IssueProjectSwitcher
              workspaceId={context.workspaceId}
              workspaceSlug={workspaceSlug}
              projectSlug={context.project.slug}
            />
          </HeaderBreadcrumbCrumb>
          <HeaderBreadcrumbCrumb title={'Issues'}>
            <NexoIcon
              icon={KeyframesMultipleAddIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
          <HeaderBreadcrumbCrumb title={`${displayIdentifier} ${issue.title}`}>
            {null}
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
    </div>
  )
}
