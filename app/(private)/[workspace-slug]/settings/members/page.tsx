import { UserMultipleIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipService } from '@/src/services/membership.service'
import { MembersManager } from './members-manager'

export const metadata: Metadata = {
  title: 'Membros | Nexo',
  description: 'Convide e gerencie os membros do workspace',
}

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN']

export default async function SettingsMembersPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string }>
}) {
  const { 'workspace-slug': slug } = await params

  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const membership = await MembershipService.getByUserAndSlug(
    session.value.user.id,
    slug,
  )
  if (!membership.ok || !membership.value) notFound()

  const canManage = PRIVILEGED_ROLES.includes(membership.value.role)

  return (
    <div className='w-full overflow-y-auto'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Membros'>
            <NexoIcon
              icon={UserMultipleIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <div className='w-full p-6 space-y-6'>
        <div>
          <H3>Membros</H3>
          <Muted>
            Convide pessoas para o workspace e acompanhe os convites pendentes.
          </Muted>
        </div>
        {canManage ? (
          <MembersManager workspaceId={membership.value.workspaceId} />
        ) : (
          <Muted>
            Apenas o dono e os administradores do workspace podem gerenciar
            convites.
          </Muted>
        )}
      </div>
    </div>
  )
}
