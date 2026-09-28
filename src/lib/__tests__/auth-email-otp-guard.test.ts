import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env/server-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env/server-admin')>()
  return {
    ...actual,
    isPlatformAdminEmail: (email?: string | null) =>
      email?.toLowerCase() === 'admin@nexopm.com',
  }
})

import {
  type EmailOtpGuardContext,
  refuseEmailOtpForAdminsWithTotp,
} from '../auth-email-otp-guard'

function makeContext(overrides?: {
  path?: string
  cookie?: string | false | null
  pending?: { value: string } | null
  email?: string | null
}): EmailOtpGuardContext {
  return {
    path: overrides?.path ?? '/two-factor/send-otp',
    getSignedCookie: async () =>
      overrides?.cookie === undefined ? '2fa-identifier' : overrides.cookie,
    context: {
      secret: 'test-secret',
      createAuthCookie: (name: string) => ({ name: `better-auth.${name}` }),
      internalAdapter: {
        findVerificationValue: async () =>
          overrides?.pending === undefined
            ? { value: 'user-1' }
            : overrides.pending,
        findUserById: async (id: string) => ({
          id,
          email:
            overrides?.email === undefined
              ? 'admin@nexopm.com'
              : overrides.email,
        }),
      },
    },
  }
}

const withAuthenticator = async () => true
const withoutAuthenticator = async () => false

beforeEach(() => {
  vi.clearAllMocks()
})

describe('refuseEmailOtpForAdminsWithTotp()', () => {
  it('refuses the e-mailed code for an admin with an authenticator', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(makeContext(), withAuthenticator),
    ).rejects.toMatchObject({ body: { code: 'EMAIL_OTP_NOT_ALLOWED' } })
  })

  it('refuses the verification too, not only the send', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(
        makeContext({ path: '/two-factor/verify-otp' }),
        withAuthenticator,
      ),
    ).rejects.toMatchObject({ body: { code: 'EMAIL_OTP_NOT_ALLOWED' } })
  })

  // Taking the only factor away would be a lockout, not a hardening.
  it('leaves an admin whose single factor is e-mail alone', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(makeContext(), withoutAuthenticator),
    ).resolves.toBeUndefined()
  })

  it('leaves a normal account alone, authenticator or not', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(
        makeContext({ email: 'ana@nexo.dev' }),
        withAuthenticator,
      ),
    ).resolves.toBeUndefined()
  })

  it('ignores endpoints outside the e-mail factor', async () => {
    for (const path of [
      '/two-factor/verify-totp',
      '/two-factor/verify-backup-code',
      '/two-factor/enable',
      '/sign-in/email',
    ]) {
      await expect(
        refuseEmailOtpForAdminsWithTotp(
          makeContext({ path }),
          withAuthenticator,
        ),
      ).resolves.toBeUndefined()
    }
  })

  // Enabling or disabling 2FA runs with a live session and no challenge
  // cookie. Refusing there would break the toggle itself.
  it('does nothing without a challenge in flight', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(
        makeContext({ cookie: null }),
        withAuthenticator,
      ),
    ).resolves.toBeUndefined()
  })

  it('does nothing when the cookie signature does not check out', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(
        makeContext({ cookie: false }),
        withAuthenticator,
      ),
    ).resolves.toBeUndefined()
  })

  it('does nothing when the challenge has already expired', async () => {
    await expect(
      refuseEmailOtpForAdminsWithTotp(
        makeContext({ pending: null }),
        withAuthenticator,
      ),
    ).resolves.toBeUndefined()
  })
})
