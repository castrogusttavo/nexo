import { describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))
vi.mock('@/src/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))

import { auth } from '@/src/lib/auth'
import { getAuthSession } from '@/src/lib/auth-session'

const mockedAuth = vi.mocked(auth)

describe('getAuthSession()', () => {
  it('should return ok with session when present', async () => {
    const fakeSession = { user: { id: 'u1', email: 'x@y.z' } }
    mockedAuth.api.getSession.mockResolvedValue(fakeSession as never)

    const result = await getAuthSession()

    const value = expectOk(result)
    expect(value).toEqual(fakeSession)
  })

  it('should return UNAUTHORIZED when no session', async () => {
    mockedAuth.api.getSession.mockResolvedValue(null as never)

    const result = await getAuthSession()

    const error = expectErr(result, 'UNAUTHORIZED')
    expect(error.message).toBe('Nao autenticado')
  })
})
