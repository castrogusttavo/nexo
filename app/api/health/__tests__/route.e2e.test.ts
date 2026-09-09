import { describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

describe('GET /api/health', () => {
  it('should return 200 with status ok, unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})
