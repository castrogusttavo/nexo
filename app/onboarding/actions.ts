'use server'

import type { OnboardingStep } from '@prisma/client'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'

export async function advanceOboardingStep(currentStep: OnboardingStep) {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  await UserService.completeOnboardingStep(auth.value.user.id, currentStep)

  redirect('/onboarding')
}

export async function goBackOnboarding() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  await UserService.goBackOnboardingStep(auth.value.user.id)
}
