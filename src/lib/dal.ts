import 'server-only'
import { cacheLife } from 'next/cache'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { onboardingDestination } from '@/app/onboarding/_lib/destination'
import { auth } from '@/src/lib/auth'
import { requireConsent } from '@/src/lib/consent'
import type { MembershipDTO } from '@/src/mappers/membership.mapper'
import { MembershipService } from '@/src/services/membership.service'
import { UserService } from '@/src/services/user.service'

// Data Access Layer for rendering . Authorization lives here, next to the data
// instead of in layouts: a layout neither re-redenrs on navigation nor stops
// its children from rendering, so a gate there is not a security boundary
// (Next 16 authentication guide, "Layouts and auth checks")
//
// Every check is `use cache: private`: it reads the request, runs again on
// every server request, and only the client router keeps the result (stale
// 5 min), which is what lets the authenticated content join the App Shell.
// Revoking a session or consent therefore takes up to 5 min to reach a tab
// that already holds the shell; the server and the API routes see it at once.
//
// API routes keep using getAuthSession(), which returns a Result.

export type CurrentUser = {
  id: string
  name: string
  email: string
  image: string | null
}

const SHELL_STALE = { stale: 300 }

// Not cached on its own: callers are private scopes. Inside one, Better
// Auth's `new Date()` expiry check is allowed, which is what connection()
// was there for in getAuthSession().
async function readUser(): Promise<CurrentUser> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const { id, name, email, image } = session.user
  return { id, name, email, image: image ?? null }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  'use cache: private'
  cacheLife(SHELL_STALE)

  return readUser()
}

// SECURITY GATE (STR-61) - do not remove or weaken
// Same rule as the API mutation routes (requireContent), including the
// Axiom audit for the blocked attempt. Every page under (private) that renders
// user or workspace data must call this (or requireMembership) before reading.
// redirect() throws, so a blocked result is never cached.
export async function requireConsentedUser(
  resource: string,
): Promise<CurrentUser> {
  'use cache: private'
  cacheLife(SHELL_STALE)

  const user = await readUser()
  const consent = await requireConsent(user.id, resource)
  if (!consent.ok) redirect('/onboarding/consent-setup')

  return user
}

export async function requireMembership(
  slug: string,
): Promise<{ user: CurrentUser; membership: MembershipDTO }> {
  'use cache: private'
  cacheLife(SHELL_STALE)

  const user = await readUser()
  const consent = await requireConsent(user.id, `page:workspace:${slug}`)
  if (!consent.ok) redirect('/onboarding/consent-setup')

  const membership = await MembershipService.getByUserAndSlug(user.id, slug)
  if (membership.ok && membership.value) {
    return { user, membership: membership.value }
  }

  // Not a member = same routing the workspace layout does today.
  const profile = await UserService.getProfile(user.id)
  if (profile.ok && profile.value.onboardingStep !== null) {
    redirect(await onboardingDestination(user.id))
  }

  const memberships = await MembershipService.listByUser(user.id)
  if (memberships.ok && memberships.value.length === 0) {
    redirect('/create-workspace')
  }
  notFound()
}
