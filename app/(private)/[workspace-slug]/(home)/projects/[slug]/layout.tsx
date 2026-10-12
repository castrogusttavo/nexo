import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ProjectTabs } from '@/app/_components/navigation/project-tabs/project-tabs'
import { getProjectContext } from '@/src/lib/project-context'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string; slug: string }>
}) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  const context = await getProjectContext(workspaceSlug, slug)
  if (!context) notFound()

  return (
    <div className='flex flex-col w-full h-full min-h-0'>
      <ProjectTabs
        workspaceId={context.workspaceId}
        workspaceSlug={workspaceSlug}
        project={context.project}
        canManage={
          context.isPrivileged || context.project.leadId === context.userId
        }
      />
      <div className='flex flex-1 min-h-0'>{children}</div>
    </div>
  )
}
