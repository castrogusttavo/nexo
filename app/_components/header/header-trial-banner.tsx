'use client'

import type { PlanGrid } from '@/app/(web)/_components/pricing/plans'
import { useHydrated } from '@/components/hooks/use-hydrated'
import { TRIAL_BANNER_DAYS } from '@/src/config/trial'
import { HeaderPromotionBanner } from './header-promotion-banner'

interface HeaderTrialBannerProps {
  endDate: string
  plan: PlanGrid
  slug: string
}

// Shows the promotion banner only during the last TRIAL_BANNER_DAYS days of
// the trial. Both the window and the banner's countdown and end date depend
// on the viewer's clock and time zone, so nothing renders until hydration:
// deciding during SSR used the server's clock and UTC date, which differed
// from the browser's and broke hydration (on the server it also sits in the
// prefetched shell, where Date.now() is refused).
export function HeaderTrialBanner(props: HeaderTrialBannerProps) {
  const hydrated = useHydrated()
  if (!hydrated) return null

  const end = new Date(props.endDate).getTime()
  const now = Date.now()
  if (end <= now || end > now + TRIAL_BANNER_DAYS * 86_400_000) return null

  return <HeaderPromotionBanner {...props} now={now} />
}
