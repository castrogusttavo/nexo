import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWikiContext } from '@/src/lib/wiki-context'

export const metadata: Metadata = {
  title: 'Wiki | Nexo',
  description: 'Base de conhecimento do workspace.',
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': workspaceSlug } = await params
  const context = await getWikiContext(workspaceSlug)
  if (!context) notFound()

  return (
    <div className='flex h-full flex-1 items-center justify-center text-sm text-muted-foreground'>
      Selecione ou crie uma página para começar.
    </div>
  )
}
