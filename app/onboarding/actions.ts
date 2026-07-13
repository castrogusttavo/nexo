'use server'

import type { OnboardingStep } from '@prisma/client'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { OnboardingService } from '@/src/services/onboarding.service'

export async function advanceOboardingStep(currentStep: OnboardingStep) {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  await OnboardingService.completeOnboardingStep(
    auth.value.user.id,
    currentStep,
  )

  redirect('/onboarding')
}

export async function goBackOnboarding() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  await OnboardingService.goBackOnboardingStep(auth.value.user.id)
}
