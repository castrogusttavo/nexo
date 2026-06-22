'use server'

import type { OnboardingStep } from '@prisma/client'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'

const NEXT_STEP: Record<OnboardingStep, OnboardingStep | null> = {
  PROFILE: 'ROLE',
  ROLE: 'BRINGS',
  BRINGS: 'WORKSPACE',
  WORKSPACE: null,
}

const PREV_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  ROLE: 'PROFILE',
  BRINGS: 'ROLE',
  WORKSPACE: 'BRINGS',
}

export async function advanceOboardingStep(currentStep: OnboardingStep) {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  await prisma.user.update({
    where: { id: auth.value.user.id },
    data: { onboardingStep: NEXT_STEP[currentStep] },
  })

  redirect('/onboarding')
}

export async function goBackOnboarding() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { id: auth.value.user.id },
    select: { onboardingStep: true },
  })

  const prevStep = user?.onboardingStep
    ? PREV_STEP[user.onboardingStep]
    : undefined
  if (!prevStep) return

  await prisma.user.update({
    where: { id: auth.value.user.id },
    data: { onboardingStep: prevStep },
  })
}
