'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STEP_MAP: Record<string, number> = {
  '/onboarding/consent-setup': 1,
  '/onboarding/profile-setup': 2,
  '/onboarding/role-setup': 3,
  '/onboarding/goals-setup': 4,
  '/onboarding/workspace-setup': 5,
}

const TOTAL_STEPS = 5

export function OnboardingProgressBar() {
  const pathname = usePathname()
  const step = STEP_MAP[pathname] ?? 1
  const percent = (step / TOTAL_STEPS) * 100

  const [width, setWidth] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(percent))
    return () => cancelAnimationFrame(id)
  }, [percent])

  return (
    <div className='w-full h-1.5 rounded-t-lg bg-muted relative'>
      <div
        className={cn(
          'absolute inset-y-0 left-0 bg-branding-500 rounded-tl-lg transition-all duration-500',
          step === TOTAL_STEPS && 'rounded-tr-lg',
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
