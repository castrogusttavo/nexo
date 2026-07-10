'use client'

import Link from 'next/link'
import {
  formatPlanName,
  type PlanGrid,
} from '@/app/(web)/_components/pricing/plans'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

interface HeaderPromotionBannerProps {
  endDate: string
  plan: PlanGrid
  slug: string
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})

export function HeaderPromotionBanner({
  endDate,
  plan,
  slug,
}: HeaderPromotionBannerProps) {
  const end = new Date(endDate)
  const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000))
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`
  const planName = formatPlanName(plan)

  return (
    <div className='flex justify-center items-center py-3 px-5 gap-3 bg-branding-950'>
      <Muted className='text-primary text-xs font-medium'>
        Restam {dayLabel} do seu teste do plano {planName}. Depois de{' '}
        {dateFormatter.format(end)}, você volta ao plano Free.
      </Muted>
      <div className='flex items-center gap-2'>
        <Button
          size='xs'
          nativeButton={false}
          render={
            <Link href={`/upgrade?plan=${plan}&billing=yearly`}>
              Assinar {planName}
            </Link>
          }
        />
        <Button
          variant='ghost'
          size='xs'
          className='underline hover:bg-transparent!'
          nativeButton={false}
          render={<Link href={`/${slug}/settings/billing`}>Ver planos</Link>}
        />
      </div>
    </div>
  )
}
