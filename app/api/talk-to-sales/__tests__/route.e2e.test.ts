import { describe, expect, it } from 'vitest'
import { BASE_URL } from '@/src/__tests__/setup.e2e'

async function post(body: unknown) {
  return fetch(`${BASE_URL}/api/talk-to-sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const valid = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  teamSize: '11-50',
  message: 'Queremos avalia o Enterprise para a equipe.',
}

describe('POST /api/talk-to/sales', () => {
  it('should accept a valid inquiry (no auth required)', async () => {
    const res = await post(valid)
    expect(res.status).toBe(201)
  })

  it('should return 422 for invalid payload', async () => {
    const res = await post({ ...valid, email: 'nope', teamSize: 'huge' })
    expect(res.status).toBe(422)
  })
})
