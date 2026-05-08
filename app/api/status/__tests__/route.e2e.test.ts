import { describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

describe('GET /api/status', () => {
  it('should return 200 with snapshot envelope', async () => {
    const res = await fetch(`${BASE_URL}/api/status`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('overallStatus')
    expect(body.data).toHaveProperty('generatedAt')
    expect(Array.isArray(body.data.components)).toBe(true)
  })

  it('should set Cache-Control with 30s max-age', async () => {
    const res = await fetch(`${BASE_URL}/api/status`)
    const cacheControl = res.headers.get('Cache-Control') ?? ''
    expect(cacheControl).toContain('max-age=30')
    expect(cacheControl).toContain('stale-while-revalidate=60')
  })

  it('should include all known components in snapshot', async () => {
    const res = await fetch(`${BASE_URL}/api/status`)
    const body = await res.json()

    const keys = body.data.components.map((c: { key: string }) => c.key).sort()
    expect(keys).toEqual(
      [
        'app',
        'auth',
        'cache',
        'database',
        'email',
        'payment',
        'storage',
      ].sort(),
    )
  })
})
