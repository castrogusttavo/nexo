import { describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

const SECRET = process.env.STATUS_COLLECTOR_SECRET ?? ''

async function postCollect(secret: string | null) {
  const headers: Record<string, string> = {}
  if (secret !== null) headers['x-status-secret'] = secret
  return fetch(`${BASE_URL}/api/status/collect/core`, {
    method: 'POST',
    headers,
  })
}

describe('POST /api/status/collect/core', () => {
  it('should return 401 when x-status-secret is missing', async () => {
    const res = await postCollect(null)
    expect(res.status).toBe(401)
  })

  it('should return 401 when x-status-secret is wrong', async () => {
    const res = await postCollect('wrong-secret')
    expect(res.status).toBe(401)
  })

  it('should return 401 when secret is correct prefix but wrong length', async () => {
    const res = await postCollect(SECRET.slice(0, SECRET.length - 1))
    expect(res.status).toBe(401)
  })

  it('should return 200 and run probes when secret is correct', async () => {
    const res = await postCollect(SECRET)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tier).toBe('core')
    expect(body.data.collectedAt).toBeDefined()
  })
})
