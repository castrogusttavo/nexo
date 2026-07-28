import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { UserHeader } from '@/app/_components/header/header-layout-user'
import { HeaderPromotionBanner } from '@/app/_components/header/header-promotion-banner'
import { GlobalSidebarNavigation } from '@/app/_components/navigation/sidebar-global'
import { TRIAL_BANNER_DAYS } from '@/src/config/trial'
import { getAuthSession } from '@/src/lib/auth-session'
import { getWorkspaceMembership } from '@/src/lib/workspace-context'
import { MembershipService } from '@/src/services/membership.service'
import { SubscriptionService } from '@/src/services/subscription.service'
import { UserService } from '@/src/services/user.service'

type WorkspaceLayoutProps = {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}

export async function generateMetadata({
  params,
}: WorkspaceLayoutProps): Promise<Metadata> {
  const { 'workspace-slug': slug } = await params

  return {
    title: `${slug} | Nexo`,
    description:
      'Nexo brings projects, docs, and AI-powered workflows into one unified workspace so teams and agents can plan, execute, and stay aligned.',
  }
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const [{ 'workspace-slug': slug }, session] = await Promise.all([
    params,
    getAuthSession(),
  ])

  if (!session.ok) redirect('/sign-in')

  const [userResult, membership] = await Promise.all([
    UserService.getProfile(session.value.user.id),
    getWorkspaceMembership(session.value.user.id, slug),
  ])

  const isMember = membership.ok && membership.value !== null

  if (!isMember && userResult.ok && userResult.value.onboardingStep !== null) {
    redirect('/onboarding')
  }

  if (!membership.ok || !membership.value) {
    const memberships = await MembershipService.listByUser(
      session.value.user.id,
    )
    if (memberships.ok && memberships.value.length === 0) {
      redirect('/create-workspace')
    }
    notFound()
  }

  const workspace = membership.value.workspace
  const trialEndsAt = workspace.trialEndsAt
    ? new Date(workspace.trialEndsAt)
    : null

  // Banner só nos últimos TRIAL_BANNER_DAYS dias do trial.
  const now = Date.now()
  const trialEndingSoon =
    trialEndsAt !== null &&
    trialEndsAt.getTime() > now &&
    trialEndsAt.getTime() <= now + TRIAL_BANNER_DAYS * 86_400_000
  let showTrialBanner = false
  if (trialEndingSoon) {
    const activeSub = await SubscriptionService.getActiveByWorkspace(
      workspace.id,
    )
    showTrialBanner = !(activeSub.ok && activeSub.value !== null)
  }

  return (
    <div className='flex flex-col h-screen overflow-hidden gap-y-0.5'>
      {showTrialBanner && workspace.trialEndsAt && (
        <HeaderPromotionBanner
          endDate={workspace.trialEndsAt}
          plan={workspace.activePlan}
          slug={slug}
        />
      )}
      <UserHeader slug={slug} />
      <div className='flex gap-x-1.5 flex-1 overflow-hidden min-h-0 pr-2 pb-2'>
        <GlobalSidebarNavigation slug={slug} />
        <div className='flex-1 w-full flex items-start bg-app rounded-lg border border-border overflow-hidden'>
          {children}
        </div>
      </div>
    </div>
  )
}
