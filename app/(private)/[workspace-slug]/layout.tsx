import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { UserHeader } from '@/app/_components/header/header-layout-user'
import { HeaderPromotionBanner } from '@/app/_components/header/header-promotion-banner'
import { GlobalSidebarNavigation } from '@/app/_components/navigation/sidebar-global'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipRepository } from '@/src/repositories/membership.repository'
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

  const userResult = await UserRepository.findById(session.value.user.id)
  if (userResult.ok && userResult.value.onboardingStep !== null) {
    redirect('/onboarding')
  }

  const membership = await MembershipRepository.findByUserAndSlug(
    session.value.user.id,
    slug,
  )

  if (!membership.ok || !membership.value) {
    const memberships = await MembershipRepository.listByUser(
      session.value.user.id,
    )
    if (memberships.ok && memberships.value.length === 0) {
      redirect('/create-workspace')
    }
    notFound()
  }

  return (
    <div className='flex flex-col h-screen overflow-hidden gap-y-0.5'>
      <HeaderPromotionBanner EndDate='2025-05-15' />
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
