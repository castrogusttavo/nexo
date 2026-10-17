import { type NextRequest, NextResponse } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { auth } from '@/src/lib/auth'
import { onboardingDestination } from './_lib/destination'

// /onboarding renders nothing: it only sends the user to the step they are
// on, so a direct hit gets the redirect without rendering a page (and its
// layout) first. The steps themselves redirect straight to
// onboardingDestination() instead of passing through here. Relative
// Locations for the same reason as app/home/route.ts.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

export const GET = withAxiom(async (request: NextRequest) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return redirectTo('/sign-in')

  return redirectTo(await onboardingDestination(session.user.id))
})
