import { UserMultipleIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { requireMembership } from '@/src/lib/dal'
import { MembersManager } from './members-manager'

export const metadata: Metadata = {
  title: 'Membros | Nexo',
  description: 'Convide e gerencie os membros do workspace',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN']

type Params = Promise<{ 'workspace-slug': string }>

// The heading is the same for everyone and renders at once; who is asking
// decides what goes under it, so that part waits inside the boundary.
export default function SettingsMembersPage({ params }: { params: Params }) {
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
        <Suspense fallback={<PageSkeleton />}>
          <Members params={params} />
        </Suspense>
      </div>
    </div>
  )
}

async function Members({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)

  if (!PRIVILEGED_ROLES.includes(membership.role)) {
    return (
      <Muted>
        Apenas o dono e os administradores do workspace podem gerenciar
        convites.
      </Muted>
    )
  }

  return <MembersManager workspaceId={membership.workspaceId} />
}
