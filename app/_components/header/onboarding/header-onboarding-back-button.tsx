'use client'

import { ArrowLeft01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { goBackOnboarding } from '@/app/onboarding/actions'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'

const PREV_ROUTE: Record<string, string> = {
  '/onboarding/role-setup': '/onboarding/profile-setup',
  '/onboarding/goals-setup': '/onboarding/role-setup',
  '/onboarding/workspace-setup': '/onboarding/goals-setup',
}

export function OnboardingBackButton() {
  const pathname = usePathname()
  const { push } = useRouter()
  const [isPending, startTransition] = useTransition()
  const prev = PREV_ROUTE[pathname]

  if (!prev) return null

  function handleBack() {
    startTransition(async () => {
      await goBackOnboarding()
      push(prev)
    })
  }

  return (
    <Button
      variant='ghost'
      size='icon-xs'
      onClick={handleBack}
      disabled={isPending}
    >
      <NexoIcon icon={ArrowLeft01Icon} />
    </Button>
  )
}
