import { redirect } from 'next/navigation'

// A project has no page of its own: its landing tab is the overview.
// Nothing here ever renders, so there is no shell to make instant: the
// redirect needs the params, and that is the whole page.
export const instant = false

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string; slug: string }>
}) {
  const { 'workspace-slug': workspaceSlug, slug } = await params
  redirect(`/${workspaceSlug}/projects/${slug}/overview`)
}
