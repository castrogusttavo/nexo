import type { OnboardingStep } from '@prisma/client'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { UserRepository } from '@/src/repositories/user.repository'

const STEP_ROUTES: Record<OnboardingStep, string> = {
  PROFILE: '/onboarding/profile-setup', // era: profile-setup
  ROLE: '/onboarding/role-setup',
  BRINGS: '/onboarding/goals-setup', // era: brings-setup
  WORKSPACE: '/onboarding/workspace-setup',
}

export default async function OnboardingPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserRepository.findById(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  const user = userResult.value

  if (!user.acceptedTermsAt || !user.acceptedPrivacyAt) {
    redirect('/onboarding/consent-setup')
  }

  if (!user.onboardingStep) redirect('/')

  if (
    user.onboardingStep === 'PROFILE' ||
    user.onboardingStep === 'ROLE' ||
    user.onboardingStep === 'BRINGS'
  ) {
    const memberships = await MembershipRepository.listByUser(user.id)
    if (memberships.ok && memberships.value.length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: null },
      })
      redirect('/')
    }
  }

  redirect(STEP_ROUTES[user.onboardingStep])
}
