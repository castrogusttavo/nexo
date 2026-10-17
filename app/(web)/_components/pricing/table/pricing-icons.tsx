import {
  CheckIcon,
  InformationCircleIcon,
  SolidLine01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { IconSprite, SpriteIcon } from '@/components/icon/icon-sprite'

// The comparison table repeats three icons ~550 times between the desktop
// table and the mobile list; they are drawn once here (PricingIconSprite,
// rendered by PricingTableDetailsPlan) and referenced everywhere else.
const ICONS = {
  'pricing-check': CheckIcon,
  'pricing-dash': SolidLine01Icon,
  'pricing-info': InformationCircleIcon,
}

export function PricingIconSprite() {
  return <IconSprite icons={ICONS} strokeWidth={2} />
}

export function IncludedIcon({ className }: { className?: string }) {
  return (
    <>
      <SpriteIcon id='pricing-check' size={20} className={className} />
      <span className='sr-only'>Incluído</span>
    </>
  )
}

export function NotIncludedIcon({ className }: { className?: string }) {
  return (
    <>
      <SpriteIcon
        id='pricing-dash'
        size={20}
        className={`text-muted-foreground ${className ?? ''}`}
      />
      <span className='sr-only'>Não incluído</span>
    </>
  )
}

export function InfoIcon() {
  return (
    <>
      <SpriteIcon id='pricing-info' />
      <span className='sr-only'>Mais informações</span>
    </>
  )
}
