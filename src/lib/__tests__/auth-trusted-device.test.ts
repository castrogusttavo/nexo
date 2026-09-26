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
  refuseTrustedDeviceForAdmins,
  type TrustedDeviceContext,
} from '../auth-trusted-device'

function makeContext(overrides?: {
  path?: string
  email?: string | null
  newSession?: null
}): TrustedDeviceContext & { setCookie: ReturnType<typeof vi.fn> } {
  const setCookie = vi.fn()
  return {
    path: overrides?.path ?? '/two-factor/verify-otp',
    context: {
      newSession:
        overrides?.newSession === null
          ? null
          : {
              user: {
                id: 'user-1',
                email: overrides?.email ?? 'admin@nexopm.com',
              },
            },
      createAuthCookie: (name: string) => ({
        name: `better-auth.${name}`,
        attributes: { httpOnly: true, path: '/' },
      }),
    },
    setCookie,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('refuseTrustedDeviceForAdmins()', () => {
  it('expires the trusted-device cookie for a platform admin', async () => {
    const ctx = makeContext()

    await refuseTrustedDeviceForAdmins(ctx)

    expect(ctx.setCookie).toHaveBeenCalledWith(
      'better-auth.trust_device',
      '',
      expect.objectContaining({ maxAge: 0 }),
    )
  })

  it('leaves a normal account trusted', async () => {
    const ctx = makeContext({ email: 'ana@nexo.dev' })

    await refuseTrustedDeviceForAdmins(ctx)

    expect(ctx.setCookie).not.toHaveBeenCalled()
  })

  // The hook runs after every endpoint, so anything outside the verification
  // paths must be left completely alone.
  it('ignores endpoints other than the second-factor verifications', async () => {
    const ctx = makeContext({ path: '/sign-in/email' })

    await refuseTrustedDeviceForAdmins(ctx)

    expect(ctx.setCookie).not.toHaveBeenCalled()
  })

  it('covers the backup-code and app-code verifications too', async () => {
    for (const path of [
      '/two-factor/verify-totp',
      '/two-factor/verify-backup-code',
    ]) {
      const ctx = makeContext({ path })

      await refuseTrustedDeviceForAdmins(ctx)

      expect(ctx.setCookie).toHaveBeenCalledTimes(1)
    }
  })

  // While a 2FA challenge is in flight better-auth nulls `newSession`, so the
  // hook has to tolerate not having a user at all.
  it('does nothing when there is no session yet', async () => {
    const ctx = makeContext({ newSession: null })

    await refuseTrustedDeviceForAdmins(ctx)

    expect(ctx.setCookie).not.toHaveBeenCalled()
  })
})
