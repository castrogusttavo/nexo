import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  createWorkspaceForUser,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

const get = (cookie?: string) =>
  fetch(`${BASE_URL}/onboarding`, {
    redirect: 'manual',
    headers: cookie ? { Cookie: cookie } : {},
  })

const locationPath = (res: Response) =>
  new URL(res.headers.get('location') ?? '', BASE_URL).pathname

// /onboarding renders nothing; it only sends the user to the step they are on.
describe('GET /onboarding', () => {
  it('sends someone without a session to sign-in', async () => {
    const res = await get()

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/sign-in')
  })

  it('asks for the terms first when they were never accepted', async () => {
    const { cookie } = await createAuthenticatedUser({ skipConsent: true })

    const res = await get(cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/onboarding/consent-setup')
  })

  it.each([
    ['PROFILE', '/onboarding/profile-setup'],
    ['ROLE', '/onboarding/role-setup'],
    ['BRINGS', '/onboarding/goals-setup'],
    ['WORKSPACE', '/onboarding/workspace-setup'],
  ] as const)('sends a user on step %s to %s', async (step, path) => {
    const { id, cookie } = await createAuthenticatedUser()
    await prisma.user.update({ where: { id }, data: { onboardingStep: step } })

    const res = await get(cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe(path)
  })

  it('sends someone who finished onboarding home', async () => {
    const { id, cookie } = await createAuthenticatedUser()
    await prisma.user.update({
      where: { id },
      data: { onboardingStep: null },
    })

    const res = await get(cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/home')
  })

  it('sends a member who is mid-onboarding home instead of back to a step', async () => {
    const { id, cookie } = await createAuthenticatedUser()
    await createWorkspaceForUser(id)
    await prisma.user.update({
      where: { id },
      data: { onboardingStep: 'ROLE' },
    })

    const res = await get(cookie)

    expect(res.status).toBe(307)
    expect(locationPath(res)).toBe('/home')
  })
})
