import { describe, expect, it } from 'vitest'
import { CONNECTION_ERROR, settleAuthRequest } from '../auth-request'

describe('settleAuthRequest', () => {
  it('passes a resolved result through untouched', async () => {
    const result = { data: { id: 'user-1' }, error: null }

    await expect(settleAuthRequest(Promise.resolve(result))).resolves.toBe(
      result,
    )
  })

  it('keeps an API error resolved as a value', async () => {
    const result = { data: null, error: { status: 401, message: 'Nope' } }

    await expect(settleAuthRequest(Promise.resolve(result))).resolves.toBe(
      result,
    )
  })

  it('turns a rejected request into the connection error shape', async () => {
    await expect(
      settleAuthRequest(Promise.reject(new TypeError('Failed to fetch'))),
    ).resolves.toEqual({ data: null, error: { message: CONNECTION_ERROR } })
  })
})
