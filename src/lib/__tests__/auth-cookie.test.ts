import { getCookieCache } from 'better-auth/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cookieCacheSecret,
  readCookieConsent,
  SESSION_DATA_COOKIE,
} from '../auth-cookie'

vi.mock('better-auth/cookies', () => ({ getCookieCache: vi.fn() }))
vi.mock('@/lib/env/server', () => ({
  BETTER_AUTH_SECRET: 'ba_legacy-secret-0000',
  BETTER_AUTH_SECRETS: undefined,
}))

const cache = vi.mocked(getCookieCache)
const request = new Request('https://nexopm.com/acme')

beforeEach(() => vi.clearAllMocks())

describe('cookieCacheSecret()', () => {
  it('uses the legacy secret without versioned ones', () => {
    expect(cookieCacheSecret(undefined, 'legacy')).toBe('legacy')
  })

  it('uses the first versioned secret, like Better Auth', () => {
    expect(cookieCacheSecret('2:new:with-colon, 1:old', 'legacy')).toBe(
      'new:with-colon',
    )
  })
})

describe('readCookirConsent()', () => {
  it('is unknown without a valid cache', async () => {
    cache.mockResolvedValue(null)
    await expect(readCookieConsent(request, true)).resolves.toBe('unknown')
  })

  it('is unknown when reading the cache throws', async () => {
    cache.mockRejectedValue(new Error('no secret'))
    await expect(readCookieConsent(request, true)).resolves.toBe('unknown')
  })

  it('is missing when either acceptance is absent', async () => {
    cache.mockResolvedValue({
      user: {
        acceptedTermsAt: '2026-10-01T00:00:00.000Z',
        acceptedPrivacyAr: null,
      },
    } as never)
    await expect(readCookieConsent(request, true)).resolves.toBe('missing')
  })

  it('is consented with both acceptances', async () => {
    cache.mockResolvedValue({
      user: {
        acceptedTermsAt: '2026-10-01T00:00:00.000Z',
        acceptedPrivacyAt: '2026-10-01T00:00:00.000Z',
      },
    } as never)
    await expect(readCookieConsent(request, false)).resolves.toBe('consented')
  })

  it('reads the cookie name matching the session cookie', async () => {
    cache.mockResolvedValue(null)
    await readCookieConsent(request, false)
    expect(cache).toHaveBeenCalledWith(request, {
      isSecure: false,
      secret: 'ba_legacy-secret-0000',
    })
  })
})

describe('SESSION_DATA_COOKIE', () => {
  it.each([
    'better-auth.session_data',
    '__Secure-better-auth.session_data',
    '__Secure-better-auth.session_data.0',
  ])('matches %s', (name) => expect(SESSION_DATA_COOKIE.test(name)).toBe(true))

  it('leaves the session token alone', () => {
    expect(SESSION_DATA_COOKIE.test('better-auth.session_token')).toBe(false)
  })
})
