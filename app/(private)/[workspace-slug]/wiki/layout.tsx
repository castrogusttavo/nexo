import { type ReactNode, Suspense } from 'react'
import { ContextSidebarSkeleton } from '@/app/_components/navigation/sidebar-context'
import { WikiSidebar } from './wiki-sidebar'

// The page renders beside the sidebar instead of waiting for it; the sidebar
// needs the slug or the viewer, so it streams into its own boundary.
export default function WikiLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}) {
  return (
    <>
      <Suspense fallback={<ContextSidebarSkeleton />}>
        <WikiSidebar params={params} />
      </Suspense>
      {children}
    </>
  )
}
