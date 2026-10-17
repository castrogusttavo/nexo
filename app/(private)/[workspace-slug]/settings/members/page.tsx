import { UserMultipleIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { requireMembership } from '@/src/lib/dal'
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
  const { membership } = await requireMembership(slug)

  const canManage = PRIVILEGED_ROLES.includes(membership.role)

  return (
    <div className='w-full h-full flex flex-col overflow-hidden'>
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
      <div className='w-full p-6 flex-1 min-h-0 flex flex-col gap-6 overflow-hidden'>
        <div>
          <H3>Membros</H3>
          <Muted>Gerencie o acesso a este workspace.</Muted>
        </div>
        {canManage ? (
          <MembersManager workspaceId={membership.workspaceId} />
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
