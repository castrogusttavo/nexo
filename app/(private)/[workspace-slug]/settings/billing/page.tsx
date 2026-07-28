import { Diamond02Icon } from '@hugeicons-pro/core-bulk-rounded'
import { CreditCardIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  HeaderBreadcrumbCrumb,
  HeaderBreadcrumbList,
} from '@/app/_components/header/breadcrumb-page'
import HeaderInternalNavigation from '@/app/_components/header/header-internal-navigation'
import { formatPlanName } from '@/app/(web)/_components/pricing/plans'
import { NexoIcon } from '@/components/icon/icon'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAuthSession } from '@/src/lib/auth-session'
import { limitOf } from '@/src/lib/plans'
import { MembershipService } from '@/src/services/membership.service'
import { SubscriptionService } from '@/src/services/subscription.service'
import { BillingUpgrade } from './billing-upgrade'

export const metadata: Metadata = {
  title: 'Assinatura & Planos | Nexo',
  description: '',
}

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

export default async function SettingsBillingPage({
  params,
}: {
  params: Promise<{ 'workspace-slug': string }>
}) {
  const [{ 'workspace-slug': slug }, session] = await Promise.all([
    params,
    getAuthSession(),
  ])
  if (!session.ok) redirect('/sign-in')

  const membership = await MembershipService.getByUserAndSlug(
    session.value.user.id,
    slug,
  )
  if (!membership.ok || !membership.value) notFound()
  const workspace = membership.value.workspace
  const trialEndsAt = workspace.trialEndsAt
    ? new Date(workspace.trialEndsAt)
    : null

  const [subResult, membersResult] = await Promise.all([
    SubscriptionService.getActiveByWorkspace(workspace.id),
    MembershipService.countByWorkspace(workspace.id),
  ])
  const subscription = subResult.ok ? subResult.value : null
  const usedSeats = membersResult.ok ? membersResult.value : 0

  const now = Date.now()
  const isTrialing =
    !subscription && trialEndsAt != null && trialEndsAt.getTime() > now
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / 86_400_000))
    : 0

  // Assentos: pago = comprados; trial/plano = cap do catálogo (null = ilimitado)
  const purchasedSeats =
    subscription?.seats ?? limitOf(workspace.activePlan, 'seats')
  const freeSeats =
    purchasedSeats == null ? null : Math.max(0, purchasedSeats - usedSeats)

  const planLabel = isTrialing
    ? `${formatPlanName(workspace.activePlan)} Trial`
    : formatPlanName(workspace.activePlan)

  const periodLabel = isTrialing
    ? trialEndsAt
      ? `Termina em ${dateFmt.format(trialEndsAt)}`
      : '—'
    : subscription
      ? `${dateFmt.format(subscription.createdAt)} — ${dateFmt.format(
          addInterval(subscription.createdAt, subscription.interval),
        )}`
      : '—'

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
      <div className='w-full p-6 space-y-6'>
        <div>
          <H3>Assinatura e Planos</H3>
          <Muted>
            Escolha seu plano, gerencie assinaturas e faça upgrade facilmente
            conforme suas necessidades crescem.
          </Muted>
        </div>

        {isTrialing && (
          <div className='w-full bg-muted flex items-center px-4 py-3 gap-3 rounded-lg border border-border overflow-hidden'>
            <div className='p-2 rounded-sm bg-blue-950 w-fit flex items-center justify-center'>
              <NexoIcon
                icon={Diamond02Icon}
                className='text-primary'
                size={24}
              />
            </div>
            <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
              <div className='flex items-center gap-2'>
                <h4 className='font-bold text-sm'>
                  Seu teste de 14 dias do plano Business está ativo!
                </h4>
                <Badge className='bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 rounded-sm'>
                  {trialDaysLeft === 1
                    ? 'O teste termina em 1 dia'
                    : `O teste termina em ${trialDaysLeft} dias`}
                </Badge>
              </div>
              <Muted>
                Explore todos os recursos Business. Quando estiver pronto,
                escolha assinar. Você não será cobrado automaticamente.
              </Muted>
            </div>
          </div>
        )}

        <div className='w-full bg-muted flex flex-col items-center rounded-lg border border-border overflow-hidden'>
          <div className='w-full flex items-center justify-between px-4 py-3 gap-2'>
            <div className='flex items-center gap-1.5'>
              <h4 className='text-sm font-semibold'>{planLabel}</h4>
              <Badge className='bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-sm'>
                Seu Plano
              </Badge>
            </div>
            {subscription && (
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

        <BillingUpgrade currentPlan={workspace.activePlan} />
      </div>
    </div>
  )
}
