import { Building02Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { NexoIcon } from '@/components/icon/icon'
import { requireMembership } from '@/src/lib/dal'
import { PageSkeleton } from '../../_components/page-skeleton'
import { WorkspaceSettingsGeneralForm } from './workspace-settings-general-form'

export const metadata: Metadata = {
  title: 'Geral | Nexo',
  description: 'Nome, logo e fuso horário do workspace',
}

export const instant = true

type Params = Promise<{ 'workspace-slug': string }>

async function SettingsGeneral({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)

  return (
    <WorkspaceSettingsGeneralForm
      workspace={membership.workspace}
      role={membership.role}
    />
  )
}

export default function SettingsPage({ params }: { params: Params }) {
  return (
    <div className='w-full overflow-y-auto'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title='Geral'>
            <NexoIcon
              icon={Building02Icon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <Suspense fallback={<PageSkeleton />}>
        <SettingsGeneral params={params} />
      </Suspense>
    </div>
  )
}
