import { notFound } from 'next/navigation'
import { getProjectContext } from '@/src/lib/project-context'
import { ProjectGeneralSettingsForm } from './project-general-settings-form'

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string; slug: string }>
}) {
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
