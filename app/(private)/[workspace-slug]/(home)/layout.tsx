import { type ReactNode, Suspense } from 'react'
import { ContextSidebarSkeleton } from '@/app/_components/navigation/sidebar-context'
import { HomeSidebar } from './home-sidebar'

// The page renders beside the sidebar instead of waiting for it; the sidebar
// needs the slug or the viewer, so it streams into its own boundary.
export default function HomeLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}) {
  return (
    <>
      <Suspense fallback={<ContextSidebarSkeleton />}>
        <HomeSidebar params={params} />
      </Suspense>
      {children}
    </>
  )
}
