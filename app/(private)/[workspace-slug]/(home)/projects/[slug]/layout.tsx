import { notFound } from 'next/navigation'
import { type ReactNode, Suspense } from 'react'
import { ProjectTabs } from '@/app/_components/navigation/project-tabs/project-tabs'
import { getProjectContext } from '@/src/lib/project-context'

type Params = Promise<{ 'workspace-slug': string; slug: string }>

// The tab bar needs the project, so it streams into a bar of the same height
// and the page below renders without waiting for it.
export default function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Params
}) {
  return (
    <div className='flex flex-col w-full h-full min-h-0'>
      <Suspense
        fallback={
          <div className='h-10 shrink-0 border-b border-secondary bg-app' />
        }
      >
        <Tabs params={params} />
      </Suspense>
      <div className='flex flex-1 min-h-0'>{children}</div>
    </div>
  )
}

async function Tabs({ params }: { params: Params }) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  return (
    <ProjectTabs
      workspaceId={context.workspaceId}
      workspaceSlug={workspaceSlug}
      project={context.project}
      canManage={
        context.isPrivileged || context.project.leadId === context.userId
      }
    />
  )
}
