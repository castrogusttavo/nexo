import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { getProjectContext } from '@/src/lib/project-context'
import { ProjectGeneralSettingsForm } from './project-general-settings-form'

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string; slug: string }>

// The form needs the project, so it waits inside the boundary and the frame
// around it renders at once.
export default function ProjectSettingsPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  )
}

async function Content({ params }: { params: Params }) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  return (
    <ProjectGeneralSettingsForm
      workspaceId={context.workspaceId}
      workspaceSlug={context.workspaceSlug}
      project={context.project}
    />
  )
}
