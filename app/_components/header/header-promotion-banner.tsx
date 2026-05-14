'use client'

import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

interface PromotionHeaderProps {
  isTrial?: boolean
  EndDate: string
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})

export function HeaderPromotionBanner({
  isTrial,
  EndDate,
}: PromotionHeaderProps) {
  const end = new Date(EndDate)
  const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000))
  const formattedDate = dateFormatter.format(end)
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`

  const promotionDescription = isTrial
    ? `Restam ${dayLabel} de teste. Depois de ${formattedDate}, automações e integrações param de rodar.`
    : `Sua assinatura vence em ${dayLabel} (${formattedDate}). Você perde acesso a fluxos e integrações ativos.`

  const promotionCTA = isTrial ? 'Continuar no Business' : 'Manter plano ativo'

  return (
    <div className='flex justify-center items-center py-3 px-5 gap-3 bg-branding-950'>
      <Muted className='text-primary text-xs font-medium'>
        {promotionDescription}
      </Muted>
      <div className='flex items-center gap-2'>
        <Button size='xs'>{promotionCTA}</Button>
        <Button
          variant='ghost'
          size='xs'
          className='underline hover:bg-transparent!'
        >
          Ver planos
        </Button>
      </div>
    </div>
  )
}
