'use client'

import {
  formatPlanName,
  type PlanGrid,
} from '@/app/(web)/_components/pricing/plans'
import { ButtonLink } from '@/components/button-link'
import { LocalDate } from '@/components/local-date'
import { Muted } from '@/components/typography/text/muted'

interface HeaderPromotionBannerProps {
  endDate: string
  plan: PlanGrid
  slug: string
  /** The viewer's clock, read once by the caller after hydration. */
  now: number
}

const DAY_MONTH: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
}

export function HeaderPromotionBanner({
  endDate,
  plan,
  slug,
  now,
}: HeaderPromotionBannerProps) {
  const end = new Date(endDate)
  const days = Math.max(0, Math.ceil((end.getTime() - now) / 86_400_000))
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`
  const planName = formatPlanName(plan)

  return (
    <div className='flex justify-center items-center py-3 px-5 gap-3 bg-branding-950'>
      <Muted className='text-primary text-xs font-medium'>
        Restam {dayLabel} do seu teste do plano {planName}. Depois de{' '}
        <LocalDate value={endDate} options={DAY_MONTH} />, você volta ao plano
        Free.
      </Muted>
      <div className='flex items-center gap-2'>
        <ButtonLink href={`/upgrade?plan=${plan}&billing=yearly`} size='xs'>
          Assinar {planName}
        </ButtonLink>
        <ButtonLink
          href={`/${slug}/settings/billing`}
          variant='ghost'
          size='xs'
          className='underline hover:bg-transparent!'
        >
          Ver planos
        </ButtonLink>
      </div>
    </div>
  )
}
