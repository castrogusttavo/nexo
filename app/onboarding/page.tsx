import type { OnboardingStep } from '@prisma/client'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'

const STEP_ROUTES: Record<OnboardingStep, string> = {
  PROFILE: '/onboarding/profile-setup', // era: profile-setup
  ROLE: '/onboarding/role-setup',
  BRINGS: '/onboarding/goals-setup', // era: brings-setup
  WORKSPACE: '/onboarding/workspace-setup',
}

export default async function OnboardingPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
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
    if (user.memberships.length > 0) redirect('/')
  }

  redirect(STEP_ROUTES[user.onboardingStep])
}
