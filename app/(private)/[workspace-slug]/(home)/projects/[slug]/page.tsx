import { redirect } from 'next/navigation'

// A project has no page of its own: its landing tab is the overview.
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string; slug: string }>
}) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  redirect(`/${workspaceSlug}/projects/${slug}/overview`)
}
