import 'server-only'
import type { OnboardingStep } from '@prisma/client'
import { SIGNED_IN_HOME } from '@/src/lib/safe-redirect'
import { UserService } from '@/src/services/user.service'

const STEP_ROUTES: Record<OnboardingStep, string> = {
  PROFILE: '/onboarding/profile-setup', // era: profile-setup
  ROLE: '/onboarding/role-setup',
  BRINGS: '/onboarding/goals-setup', // era: brings-setup
  WORKSPACE: '/onboarding/workspace-setup',
}

/**
 * Where a signed-in user belongs right now: the terms, the step they are on,
 * or home once they are done. Shared by the /onboarding route handler and by
 * the steps' pages and actions, which redirect straight to the answer — the
 * client router cannot navigate to a route handler, so redirecting to
 * `/onboarding` from a server action left the browser stuck on it.
 */
export async function onboardingDestination(userId: string): Promise<string> {
  const userResult = await UserService.getProfile(userId)
  if (!userResult.ok) return '/sign-in'

  const user = userResult.value

  if (!user.acceptedTermsAt || !user.acceptedPrivacyAt) {
    return '/onboarding/consent-setup'
  }

  if (!user.onboardingStep) return SIGNED_IN_HOME

  if (
    user.onboardingStep === 'PROFILE' ||
    user.onboardingStep === 'ROLE' ||
    user.onboardingStep === 'BRINGS'
  ) {
    if (user.memberships.length > 0) return SIGNED_IN_HOME
  }

  return STEP_ROUTES[user.onboardingStep]
}
