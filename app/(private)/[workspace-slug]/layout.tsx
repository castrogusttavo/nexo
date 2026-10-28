import type { Metadata } from 'next'
import { io } from 'next/cache'
import { type ReactNode, Suspense } from 'react'
import { HeaderLayoutUser } from '@/app/_components/header/header-layout-user'
import { HeaderTrialBanner } from '@/app/_components/header/header-trial-banner'
import { NavigationSidebarGlobal } from '@/app/_components/navigation/sidebar-global'
import { Skeleton } from '@/components/ui/skeleton'
import { requireMembership } from '@/src/lib/dal'
import { SubscriptionService } from '@/src/services/subscription.service'

type Params = Promise<{ 'workspace-slug': string }>

type WorkspaceLayoutProps = {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}

// Every page under this layout sets its own title, so the only thing the
// slug bought here was the tab title of a page that forgot to. It cost the
// whole subtree its prerendered metadata: reading `params` inside
// generateMetadata makes the metadata runtime data under Cache Components.
export const metadata: Metadata = {
  title: 'Workspace | Nexo',
  description:
    'Nexo brings projects, docs, and AI-powered workflows into one unified workspace so teams and agents can plan, execute, and stay aligned.',
}

// The frame renders at once; everything that needs the slug or the viewer
// waits inside its own boundary. Access is not decided here: the DAL checks
// session, consent (STR-61) and membership wherever workspace data is read,
// and the banner's requireMembership routes a visitor who does not belong
// (onboarding step, /create-workspace or 404) on pages with no server data.
export default function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  return (
    <div className='flex flex-col h-screen overflow-hidden gap-y-0.5'>
      <Suspense fallback={null}>
        <TrialBanner params={params} />
      </Suspense>
      <Suspense fallback={<Skeleton className='mx-3.5 h-8' />}>
        <Header params={params} />
      </Suspense>
      <div className='flex gap-x-1.5 flex-1 overflow-hidden min-h-0 pr-2 pb-2'>
        <Suspense fallback={<div className='h-screen w-12' />}>
          <Sidebar params={params} />
        </Suspense>
        <div className='flex-1 w-full flex items-start bg-app rounded-lg border border-border overflow-hidden'>
          {children}
        </div>
      </div>
    </div>
  )
}

async function Header({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  return <HeaderLayoutUser slug={slug} />
}

async function Sidebar({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  return <NavigationSidebarGlobal slug={slug} />
}

async function TrialBanner({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)
  const workspace = membership.workspace
  if (!workspace.trialEndsAt) return null

  // The subscription query is the first read outside the DAL's private cache:
  // opening a pooled connection draws random bytes, which a prerender refuses.
  // io() keeps it at request time; the banner shows after hydration anyway.
  await io()
  const activeSub = await SubscriptionService.getActiveByWorkspace(workspace.id)
  if (activeSub.ok && activeSub.value !== null) return null

  return (
    <HeaderTrialBanner
      endDate={workspace.trialEndsAt}
      plan={workspace.activePlan}
      slug={slug}
    />
  )
}
