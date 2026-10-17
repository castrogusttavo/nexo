import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getWikiContext } from '@/src/lib/wiki-context'

export const metadata: Metadata = {
  title: 'Wiki | Nexo',
  description: 'Base de conhecimento do workspace.',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type Params = Promise<{ 'workspace-slug': string }>

// The prompt is the same for everyone; the access check runs beside it.
export default function WikiPage({ params }: { params: Params }) {
  return (
    <div className='flex h-full flex-1 items-center justify-center text-sm text-muted-foreground'>
      <Suspense fallback={null}>
        <WikiAccess params={params} />
      </Suspense>
      Selecione ou crie uma página para começar.
    </div>
  )
}

async function WikiAccess({ params }: { params: Params }) {
  const { 'workspace-slug': workspaceSlug } = await params
  const context = await getWikiContext(workspaceSlug)
  if (!context) notFound()
  return null
}
