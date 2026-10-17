'use client'

import type { PlanGrid } from '@/app/(web)/_components/pricing/plans'
import { TRIAL_BANNER_DAYS } from '@/src/config/trial'
import { HeaderPromotionBanner } from './header-promotion-banner'

interface HeaderTrialBannerProps {
  endDate: string
  plan: PlanGrid
  slug: string
}

// Shows the promotion banner only during the last TRIAL_BANNER_DAYS days of
// the trial. The check reads the clock, so it runs here: on the server it sits
// in the prefetched shell, where Date.now() is refused.
export function HeaderTrialBanner(props: HeaderTrialBannerProps) {
  const end = new Date(props.endDate).getTime()
  const now = Date.now()
  if (end <= now || end > now + TRIAL_BANNER_DAYS * 86_400_000) return null

  return <HeaderPromotionBanner {...props} />
}
