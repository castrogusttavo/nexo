import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forbidden } from '@/src/errors'
import { auth } from '@/src/lib/auth'
import { requireConsent } from '@/src/lib/consent'
import { err, ok } from '@/src/lib/result'
import { MembershipService } from '@/src/services/membership.service'
import { UserService } from '@/src/services/user.service'
import { getCurrentUser, requireConsentedUser, requireMembership } from '../dal'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: () => {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`)
  },
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))
vi.mock('@/src/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock('@/src/lib/consent', () => ({ requireConsent: vi.fn() }))
vi.mock('@/src/services/membership.service', () => ({
  MembershipService: { getByUserAndSlug: vi.fn(), listByUser: vi.fn() },
}))
vi.mock('@/src/services/user.service', () => ({
  UserService: { getProfile: vi.fn() },
}))
vi.mock('@/app/onboarding/_lib/destination', () => ({
  onboardingDestination: vi.fn(async () => '/onboarding/profile-setup'),
}))

const getSession = vi.mocked(auth.api.getSession)
const consent = vi.mocked(requireConsent)
const byUserAndSlug = vi.mocked(MembershipService.getByUserAndSlug)
const listByUser = vi.mocked(MembershipService.listByUser)
const getProfile = vi.mocked(UserService.getProfile)

const sessionUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@nexo.test',
  image: null,
  acceptedTermsAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ user: sessionUser } as never)
  consent.mockResolvedValue(ok(true as const))
})

describe('getCurrentUser()', () => {
  it('returns only the narrow user fields', async () => {
    await expect(getCurrentUser()).resolves.toEqual({
      id: 'u1',
      name: 'Ana',
      email: 'ana@nexo.test',
      image: null,
    })
  })

  it('redirects to /sign-in without a session', async () => {
    getSession.mockResolvedValue(null as never)
    await expect(getCurrentUser()).rejects.toThrow('REDIRECT:/sign-in')
  })
})

describe('requireConsentedUser()', () => {
  it('checks consent for the given resource', async () => {
    await requireConsentedUser('page:settings')
    expect(consent).toHaveBeenCalledWith('u1', 'page:settings')
  })

  it('redirects to consent setup when consent is missing', async () => {
    consent.mockResolvedValue(err(forbidden('Consentimento obrigatório')))
    await expect(requireConsentedUser('page:settings')).rejects.toThrow(
      'REDIRECT:/onboarding/consent-setup',
    )
  })

  it('redirects to /sign-in before checking consent', async () => {
    getSession.mockResolvedValue(null as never)
    await expect(requireConsentedUser('page:settings')).rejects.toThrow(
      'REDIRECT:/sign-in',
    )
    expect(consent).not.toHaveBeenCalled()
  })
})

describe('requireMembership()', () => {
  it('returns user and membership for a member', async () => {
    const membership = { id: 'm1', workspace: { slug: 'acme' } }
    byUserAndSlug.mockResolvedValue(ok(membership) as never)

    const result = await requireMembership('acme')

    expect(result.membership).toBe(membership)
    expect(result.user.id).toBe('u1')
  })

  it('enforces consent before reading the membership', async () => {
    consent.mockResolvedValue(err(forbidden('Consentimento obrigatório')))
    await expect(requireMembership('acme')).rejects.toThrow(
      'REDIRECT:/onboarding/consent-setup',
    )
    expect(byUserAndSlug).not.toHaveBeenCalled()
  })

  it('sends a non-member still onboarding to their step', async () => {
    byUserAndSlug.mockResolvedValue(ok(null))
    getProfile.mockResolvedValue(ok({ onboardingStep: 'PROFILE' }) as never)
    await expect(requireMembership('acme')).rejects.toThrow(
      'REDIRECT:/onboarding/profile-setup',
    )
  })

  it('sends a user with no workspace to /create-workspace', async () => {
    byUserAndSlug.mockResolvedValue(ok(null))
    getProfile.mockResolvedValue(ok({ onboardingStep: null }) as never)
    listByUser.mockResolvedValue(ok([]))
    await expect(requireMembership('acme')).rejects.toThrow(
      'REDIRECT:/create-workspace',
    )
  })

  it('404s a member of other workspaces', async () => {
    byUserAndSlug.mockResolvedValue(ok(null))
    getProfile.mockResolvedValue(ok({ onboardingStep: null }) as never)
    listByUser.mockResolvedValue(ok([{ id: 'm2' }]) as never)
    await expect(requireMembership('acme')).rejects.toThrow('NOT_FOUND')
  })
})
