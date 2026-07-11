import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { UserHeader } from '@/app/_components/header/header-layout-user'
import { HeaderPromotionBanner } from '@/app/_components/header/header-promotion-banner'
import { GlobalSidebarNavigation } from '@/app/_components/navigation/sidebar-global'
import { TRIAL_BANNER_DAYS } from '@/src/config/trial'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'
import { UserRepository } from '@/src/repositories/user.repository'

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
    UserRepository.findById(session.value.user.id),
    MembershipRepository.findByUserAndSlug(session.value.user.id, slug),
  ])

  const isMember = membership.ok && membership.value !== null

  if (!isMember && userResult.ok && userResult.value.onboardingStep !== null) {
    redirect('/onboarding')
  }

  if (!membership.ok || !membership.value) {
    const memberships = await MembershipRepository.listByUser(
      session.value.user.id,
    )
    if (memberships.ok && memberships.value.length === 0) {
      redirect('/create-workspace')
    }
    notFound()
  }

  const workspace = membership.value.workspace

  // Banner só nos últimos TRIAL_BANNER_DAYS dias do trial.
  const now = Date.now()
  const trialEndingSoon =
    workspace.trialEndsAt !== null &&
    workspace.trialEndsAt.getTime() > now &&
    workspace.trialEndsAt.getTime() <= now + TRIAL_BANNER_DAYS * 86_400_000
  let showTrialBanner = false
  if (trialEndingSoon) {
    const activeSub = await SubscriptionRepository.findActiveByWorkspaceId(
      workspace.id,
    )
    showTrialBanner = !(activeSub.ok && activeSub.value !== null)
  }

  return (
    <div className='flex flex-col h-screen overflow-hidden gap-y-0.5'>
      {showTrialBanner && workspace.trialEndsAt && (
        <HeaderPromotionBanner
          endDate={workspace.trialEndsAt.toISOString()}
          plan={workspace.activePlan}
          slug={slug}
        />
      )}
      <UserHeader slug={slug} />
      <div className='flex gap-x-1.5 flex-1 overflow-hidden min-h-0 pr-2 pb-2'>
        <GlobalSidebarNavigation slug={slug} />
        <div className='flex-1 w-full flex items-start bg-primary-foreground rounded-lg border border-border overflow-hidden'>
          {children}
        </div>
      </div>
    </div>
  )
}
