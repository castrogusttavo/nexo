import { createId } from '@paralleldrive/cuid2'
import type { Plan, Role } from '@prisma/client'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

export const defaultHeaders = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
}

// Auth limiter is 10 attempts per IP per 15min. We bypass that by using a
// unique x-forwarded-for per call so each sign-up lands in its own bucket.
function uniqueClientIp(): string {
  const a = Math.floor(Math.random() * 200) + 10
  const b = Math.floor(Math.random() * 200) + 10
  const c = Math.floor(Math.random() * 200) + 10
  const d = Math.floor(Math.random() * 200) + 10
  return `${a}.${b}.${c}.${d}`
}

export async function createAuthenticatedUser(overrides?: {
  name?: string
  email?: string
  /** Skip the consent fields the SignUpForm sends — simulates a curl
   *  client that bypasses the UI. Defaults to false (consent sent). */
  skipConsent?: boolean
}) {
  const name = overrides?.name ?? 'E2E User'
  const email = overrides?.email ?? `e2e-${createId()}@example.com`
  const password = 'Test@12345678'
  const now = new Date()
  const body: Record<string, unknown> = { name, email, password }
  if (!overrides?.skipConsent) {
    body.acceptedTermsAt = now
    body.acceptedPrivacyAt = now
  }

  const signUpRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { ...defaultHeaders, 'x-forwarded-for': uniqueClientIp() },
    body: JSON.stringify(body),
  })

  if (!signUpRes.ok) {
    throw new Error(
      `Sign-up failed (${signUpRes.status}): ${await signUpRes.text()}`,
    )
  }

  // requireEmailVerification is on, so sign-up no longer issues a session.
  // The OTP email is a no-op in tests, so mark the email verified directly
  // and sign in to obtain the session cookie.
  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: true },
    select: { id: true },
  })

  const signInRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { ...defaultHeaders, 'x-forwarded-for': uniqueClientIp() },
    body: JSON.stringify({ email, password }),
  })

  if (!signInRes.ok) {
    throw new Error(
      `Sign-in failed (${signInRes.status}): ${await signInRes.text()}`,
    )
  }

  const cookie = signInRes.headers.get('set-cookie')
  if (!cookie) throw new Error('No session cookie after sign-in')

  return { id: user.id, name, email, cookie }
}

export async function createWorkspaceForUser(
  userId: string,
  data?: { name?: string; slug?: string; activePlan?: Plan; role?: Role },
) {
  const slug = data?.slug ?? `ws-${createId().slice(0, 8)}`
  const ws = await prisma.workspace.create({
    data: {
      name: data?.name ?? 'E2E Workspace',
      slug,
      activePlan: data?.activePlan ?? 'FREE',
    },
  })
  await prisma.membership.create({
    data: { userId, workspaceId: ws.id, role: data?.role ?? 'OWNER' },
  })
  return ws
}

export async function authenticatedOwner(workspaceData?: {
  name?: string
  slug?: string
}) {
  const user = await createAuthenticatedUser()
  const ws = await createWorkspaceForUser(user.id, {
    ...workspaceData,
    role: 'OWNER',
  })
  return { user, workspace: ws }
}

export async function addMember(
  workspaceId: string,
  role: Role = 'MEMBER',
  email?: string,
) {
  const user = await createAuthenticatedUser({ email })
  await prisma.membership.create({
    data: { userId: user.id, workspaceId, role },
  })
  return user
}

interface RequestOpts {
  cookie?: string
  extraHeaders?: Record<string, string>
  /** Defaults to 'manual' so middleware redirects (307) are observable. */
  redirect?: RequestRedirect
}

function buildHeaders(cookie?: string, extra?: Record<string, string>) {
  return {
    ...defaultHeaders,
    ...(cookie ? { Cookie: cookie } : {}),
    ...(extra ?? {}),
  }
}

export async function postJson(
  path: string,
  body: unknown,
  cookieOrOpts?: string | RequestOpts,
  extraHeaders: Record<string, string> = {},
) {
  const opts: RequestOpts =
    typeof cookieOrOpts === 'string'
      ? { cookie: cookieOrOpts, extraHeaders }
      : (cookieOrOpts ?? {})
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(opts.cookie, opts.extraHeaders ?? extraHeaders),
    body: JSON.stringify(body),
    redirect: opts.redirect ?? 'manual',
  })
}

export async function patchJson(
  path: string,
  body: unknown,
  cookieOrOpts?: string | RequestOpts,
) {
  const opts: RequestOpts =
    typeof cookieOrOpts === 'string'
      ? { cookie: cookieOrOpts }
      : (cookieOrOpts ?? {})
  return fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(opts.cookie, opts.extraHeaders),
    body: JSON.stringify(body),
    redirect: opts.redirect ?? 'manual',
  })
}

export async function getJson(
  path: string,
  cookieOrOpts?: string | RequestOpts,
) {
  const opts: RequestOpts =
    typeof cookieOrOpts === 'string'
      ? { cookie: cookieOrOpts }
      : (cookieOrOpts ?? {})
  return fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(opts.cookie, opts.extraHeaders),
    redirect: opts.redirect ?? 'manual',
  })
}

export async function deleteJson(
  path: string,
  cookieOrOpts?: string | RequestOpts,
) {
  const opts: RequestOpts =
    typeof cookieOrOpts === 'string'
      ? { cookie: cookieOrOpts }
      : (cookieOrOpts ?? {})
  return fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(opts.cookie, opts.extraHeaders),
    redirect: opts.redirect ?? 'manual',
  })
}

export async function createInvite(
  workspaceId: string,
  cookie: string,
  email = 'invitee@example.com',
  role: Role = 'MEMBER',
) {
  return postJson(
    `/api/workspaces/${workspaceId}/invitations`,
    { email, role },
    cookie,
  )
}
