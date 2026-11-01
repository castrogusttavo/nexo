import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getProjectContext } from '@/src/lib/project-context'
import { ProjectOverview } from './project-overview'
import { ProjectOverviewSkeleton } from './project-overview-skeleton'

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string; slug: string }>

export const metadata: Metadata = {
  title: 'Overview - Project | Nexo',
  description: 'Gerencie os projetos do seu workspace.',
}

export default function ProjectOverviewPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ProjectOverviewSkeleton />}>
      <Overview params={params} />
    </Suspense>
  )
}

async function Overview({ params }: { params: Params }) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  return (
    <ProjectOverview
      workspaceId={context.workspaceId}
      projectSlug={slug}
      canManage={
        context.isPrivileged || context.project.leadId === context.userId
      }
      projectStatesEnabled={context.projectStatesEnabled}
    />
  )
}
