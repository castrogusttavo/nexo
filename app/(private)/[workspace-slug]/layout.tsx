import type { Metadata } from 'next'
import { type ReactNode, Suspense } from 'react'
import { UserHeader } from '@/app/_components/header/header-layout-user'
import { HeaderPromotionBanner } from '@/app/_components/header/header-promotion-banner'
import { GlobalSidebarNavigation } from '@/app/_components/navigation/sidebar-global'
import { Skeleton } from '@/components/ui/skeleton'
import { TRIAL_BANNER_DAYS } from '@/src/config/trial'
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
  return <UserHeader slug={slug} />
}

async function Sidebar({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  return <GlobalSidebarNavigation slug={slug} />
}

async function TrialBanner({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)
  const workspace = membership.workspace
  if (!workspace.trialEndsAt) return null

  // Banner only during the last TRIAL_BANNER_DAYS days of the trial.
  const trialEndsAt = new Date(workspace.trialEndsAt).getTime()
  const now = Date.now()
  const endingSoon =
    trialEndsAt > now && trialEndsAt <= now + TRIAL_BANNER_DAYS * 86_400_000
  if (!endingSoon) return null

  const activeSub = await SubscriptionService.getActiveByWorkspace(workspace.id)
  if (activeSub.ok && activeSub.value !== null) return null

  return (
    <HeaderPromotionBanner
      endDate={workspace.trialEndsAt}
      plan={workspace.activePlan}
      slug={slug}
    />
  )
}
