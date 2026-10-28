import { type NextRequest, NextResponse } from 'next/server'
import { onboardingDestination } from '@/app/onboarding/_lib/destination'
import { withAxiom } from '@/lib/axiom/server'
import { auth } from '@/src/lib/auth'
import { MembershipService } from '@/src/services/membership.service'

const SESSION_COOKIES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
] as const

// Where a signed-in visitor of `/` lands. proxy.ts redirects here whenever
// the session cookie is present, so the root itself can stay a static,
// prerendered marketing page instead of reading the session on every hit.
// The proxy only sees the cookie, not whether it is still valid: a stale one
// is cleared here and the visitor goes back to the public root, which would
// otherwise bounce between the two forever.
//
// Locations are relative on purpose: in the standalone server a route
// handler's request.url carries the bind address (http://0.0.0.0:3000), not
// the host the browser used, so an absolute URL built from it sent people to
// an origin their session cookie does not belong to.
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

// The only side effect is clearing a session cookie the server just found
// invalid: a forged or prefetched GET can at most drop a cookie that no
// longer signs anyone in. Moving it to a POST would need a page to submit
// it, and the redirect chain proxy.ts relies on cannot carry one.
// react-doctor-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler
export const GET = withAxiom(async (request: NextRequest) => {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    const response = redirectTo('/')
    for (const name of SESSION_COOKIES) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        secure: name.startsWith('__Secure-'),
      })
    }
    return response
  }

  const memberships = await MembershipService.listByUser(session.user.id)
  if (memberships.ok && memberships.value.length > 0) {
    return redirectTo(`/${memberships.value[0].workspace.slug}`)
  }

  // Straight to the step rather than through /onboarding: one hop fewer.
  return redirectTo(await onboardingDestination(session.user.id))
})
