import { describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

describe('GET /api/status/history', () => {
  it('should return 422 when componentKey is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/status/history`)
    expect(res.status).toBe(422)
  })

  it('should return 422 for unknown componentKey', async () => {
    const res = await fetch(
      `${BASE_URL}/api/status/history?componentKey=mystery`,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 when days exceeds 365', async () => {
    const res = await fetch(
      `${BASE_URL}/api/status/history?componentKey=app&days=400`,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 when days is below 1', async () => {
    const res = await fetch(
      `${BASE_URL}/api/status/history?componentKey=app&days=0`,
    )
    expect(res.status).toBe(422)
  })

  it('should return 200 with daily history for a known component', async () => {
    const res = await fetch(
      `${BASE_URL}/api/status/history?componentKey=app&days=30`,
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('should default days to 90 when omitted', async () => {
    const res = await fetch(`${BASE_URL}/api/status/history?componentKey=app`)
    expect(res.status).toBe(200)
  })

  it('should set Cache-Control on success', async () => {
    const res = await fetch(
      `${BASE_URL}/api/status/history?componentKey=app&days=30`,
    )
    const cc = res.headers.get('Cache-Control') ?? ''
    expect(cc).toContain('max-age=30')
  })
})
