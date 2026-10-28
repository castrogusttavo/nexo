import { Diamond02Icon } from '@hugeicons-pro/core-bulk-rounded'
import { CreditCardIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { io } from 'next/cache'
import { Suspense } from 'react'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { PageSkeleton } from '@/app/(private)/_components/page-skeleton'
import { SettingsPage } from '@/app/(private)/_components/settings-page'
import { formatPlanName } from '@/app/(web)/_components/pricing/plans'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireMembership } from '@/src/lib/dal'
import { limitOf } from '@/src/lib/plans'
import { MembershipService } from '@/src/services/membership.service'
import { SubscriptionService } from '@/src/services/subscription.service'
import { BillingUpgrade } from './billing-upgrade'

export const metadata: Metadata = {
  title: 'Assinatura & Planos | Nexo',
  description: '',
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function addInterval(date: Date, interval: 'MONTHLY' | 'YEARLY'): Date {
  const next = new Date(date)
  if (interval === 'YEARLY') next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)
  return next
}

type Params = Promise<{ 'workspace-slug': string }>

// The heading is the same for everyone and renders at once; the plan, the
// seats and the trial depend on the workspace and wait inside the boundary.
export default function SettingsBillingPage({ params }: { params: Params }) {
  return (
    <div className='w-full overflow-y-auto'>
      <HeaderInternalNavigation>
        <HeaderBreadcrumbList>
          <HeaderBreadcrumbCrumb title={'Assinatura e Planos'}>
            <NexoIcon
              icon={CreditCardIcon}
              strokeWidth={2}
              className='text-primary'
            />
          </HeaderBreadcrumbCrumb>
        </HeaderBreadcrumbList>
      </HeaderInternalNavigation>
      <SettingsPage
        title='Assinatura e Planos'
        description='Escolha seu plano, gerencie assinaturas e faça upgrade facilmente conforme suas necessidades crescem.'
        width='full'
      >
        <Suspense fallback={<PageSkeleton />}>
          <Billing params={params} />
        </Suspense>
      </SettingsPage>
    </div>
  )
}

async function Billing({ params }: { params: Params }) {
  const { 'workspace-slug': slug } = await params
  const { membership } = await requireMembership(slug)
  const workspace = membership.workspace

  // Below the DAL's private cache: the queries open pooled connections and
  // the trial math reads the clock, both refused while prerendering.
  await io()
  const [subResult, membersResult] = await Promise.all([
    SubscriptionService.getActiveByWorkspace(workspace.id),
    MembershipService.countByWorkspace(workspace.id),
  ])
  const subscription = subResult.ok ? subResult.value : null
  const usedSeats = membersResult.ok ? membersResult.value : 0

  const trialEndsAt = workspace.trialEndsAt
    ? new Date(workspace.trialEndsAt)
    : null
  const now = Date.now()
  const isTrialing =
    !subscription && trialEndsAt != null && trialEndsAt.getTime() > now

  // Seats: paid = purchased; trial/plan = catalog cap (null = unlimited)
  const purchasedSeats =
    subscription?.seats ?? limitOf(workspace.activePlan, 'seats')
  const freeSeats =
    purchasedSeats == null ? null : Math.max(0, purchasedSeats - usedSeats)

  return (
    <>
      {isTrialing && trialEndsAt && (
        <BillingTrialNotice
          daysLeft={Math.max(
            0,
            Math.ceil((trialEndsAt.getTime() - now) / 86_400_000),
          )}
        />
      )}
      <BillingPlanCard
        planLabel={
          isTrialing
            ? `${formatPlanName(workspace.activePlan)} Trial`
            : formatPlanName(workspace.activePlan)
        }
        canManage={subscription != null}
        usedSeats={usedSeats}
        freeSeats={freeSeats}
        periodLabel={
          isTrialing && trialEndsAt
            ? `Termina em ${dateFmt.format(trialEndsAt)}`
            : subscriptionPeriod(subscription)
        }
      />
      <BillingUpgrade currentPlan={workspace.activePlan} />
    </>
  )
}

function subscriptionPeriod(
  subscription: { createdAt: Date; interval: 'MONTHLY' | 'YEARLY' } | null,
): string {
  if (!subscription) return '—'
  const end = addInterval(subscription.createdAt, subscription.interval)
  return `${dateFmt.format(subscription.createdAt)} — ${dateFmt.format(end)}`
}

function BillingTrialNotice({ daysLeft }: { daysLeft: number }) {
  return (
    <div className='w-full bg-muted flex items-center px-4 py-3 gap-3 rounded-lg border border-border overflow-hidden'>
      <div className='p-2 rounded-sm bg-blue-950 w-fit flex items-center justify-center'>
        <NexoIcon icon={Diamond02Icon} className='text-primary' size={24} />
      </div>
      <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
        <div className='flex items-center gap-2'>
          <h4 className='font-bold text-sm'>
            Seu teste de 14 dias do plano Business está ativo!
          </h4>
          <Badge variant='warning'>
            {daysLeft === 1
              ? 'O teste termina em 1 dia'
              : `O teste termina em ${daysLeft} dias`}
          </Badge>
        </div>
        <Muted>
          Explore todos os recursos Business. Quando estiver pronto, escolha
          assinar. Você não será cobrado automaticamente.
        </Muted>
      </div>
    </div>
  )
}

interface BillingPlanCardProps {
  planLabel: string
  canManage: boolean
  usedSeats: number
  freeSeats: number | null
  periodLabel: string
}

function BillingPlanCard({
  planLabel,
  canManage,
  usedSeats,
  freeSeats,
  periodLabel,
}: BillingPlanCardProps) {
  return (
    <div className='w-full bg-muted flex flex-col items-center rounded-lg border border-border overflow-hidden'>
      <div className='w-full flex items-center justify-between px-4 py-3 gap-2'>
        <div className='flex items-center gap-1.5'>
          <h4 className='text-sm font-semibold'>{planLabel}</h4>
          <Badge variant='info'>Seu Plano</Badge>
        </div>
        {canManage && (
          <Button variant='outline' size='sm'>
            Gerenciar assinatura
          </Button>
        )}
      </div>

      <div className='w-full bg-app p-4'>
        <div className='grid grid-cols-3 max-w-4xl'>
          <div className='space-y-2'>
            <Muted>Total de usuários</Muted>
            <p className='text-sm font-medium'>{usedSeats}</p>
          </div>
          <div className='space-y-2'>
            <Muted>Assentos livres</Muted>
            <p className='text-sm font-medium'>
              {freeSeats === null ? 'Ilimitado' : freeSeats}
            </p>
          </div>
          <div className='space-y-2'>
            <Muted>Período da assinatura</Muted>
            <p className='text-sm font-medium'>{periodLabel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
