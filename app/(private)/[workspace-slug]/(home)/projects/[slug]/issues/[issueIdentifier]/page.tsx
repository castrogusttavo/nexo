import { KeyframesMultipleAddIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { getProjectContext } from '@/src/lib/project-context'
import { IssueService } from '@/src/services/issue.service'

export const metadata: Metadata = {
  title: 'Issues | Nexo',
  description: '',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{
  'workspace-slug': string
  slug: string
  issueIdentifier: string
}>

// The breadcrumb renders at once; the issue's own crumb needs the issue and
// streams in after it.
export default function ProjectIssuePage({ params }: { params: Params }) {
  return (
    <div className='w-full overflow-y-scroll'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Issues'}>
            <NexoIcon
              icon={KeyframesMultipleAddIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
          <Suspense fallback={null}>
            <IssueCrumb params={params} />
          </Suspense>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
    </div>
  )
}

async function IssueCrumb({ params }: { params: Params }) {
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
    <HeaderBreadcrumbCrumb title={`${displayIdentifier} ${issue.title}`}>
      {null}
    </HeaderBreadcrumbCrumb>
  )
}
