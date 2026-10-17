import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { WikiPageEditor } from '@/app/_components/wiki/wiki-page-editor'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { getWikiPageContext } from '@/src/lib/wiki-context'

export const metadata: Metadata = {
  title: 'Wiki | Nexo',
  description: 'Página da base de conhecimento do workspace.',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string; 'wiki-id': string }>

// The editor needs the page, so it waits inside the boundary and the frame
// around it renders at once.
export default function WikiDetailPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WikiEditor params={params} />
    </Suspense>
  )
}

async function WikiEditor({ params }: { params: Params }) {
  const { 'workspace-slug': workspaceSlug, 'wiki-id': wikiPageId } =
    await params
  const context = await getWikiPageContext(workspaceSlug, wikiPageId)
  if (!context) notFound()

  return (
    <WikiPageEditor
      workspaceId={context.workspaceId}
      userId={context.userId}
      userName={context.userName}
      page={context.page}
    />
  )
}
