import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WikiPageEditor } from '@/app/_components/wiki/wiki-page-editor'
import { getWikiPageContext } from '@/src/lib/wiki-context'

export const metadata: Metadata = {
  title: 'Wiki | Nexo',
  description: 'Página da base de conhecimento do workspace.',
}

export default async function WikiDetailPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string; 'wiki-id': string }>
}) {
  const { 'workspace-slug': workspaceSlug, 'wiki-id': wikiPageId } =
    await params
  const context = await getWikiPageContext(workspaceSlug, wikiPageId)
  if (!context) notFound()

  return (
    <WikiPageEditor workspaceId={context.workspaceId} page={context.page} />
  )
}
