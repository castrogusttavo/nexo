import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { UserHeader } from '@/app/_components/header/header-layout-user'
import { GlobalSidebarNavigation } from '@/app/_components/navigation/sidebar-global'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipRepository } from '@/src/repositories/membership.repository'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': slug } = await params

  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

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
    <div className='flex flex-col h-screen overflow-hidden'>
      <UserHeader slug={slug} />
      <div className='flex gap-x-1.5 flex-1 overflow-hidden min-h-0'>
        <GlobalSidebarNavigation slug={slug} />
        <div className='flex-1 w-full flex items-start bg-primary-foreground rounded-lg border border-border overflow-hidden'>
          {children}
        </div>
      </div>
    </div>
  )
}
