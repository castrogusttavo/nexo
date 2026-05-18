import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  defaultHeaders,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

describe('GET /api/short-links', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/short-links`, {
      headers: defaultHeaders,
    })
    expect(res.status).toBe(401)
  })

  it('should return only the authenticated user links', async () => {
    const [a, b] = await Promise.all([
      createAuthenticatedUser(),
      createAuthenticatedUser(),
    ])
    await prisma.shortLink.create({
      data: { title: 'A1', url: 'https://a1.com', userId: a.id },
    })
    await prisma.shortLink.create({
      data: { title: 'A2', url: 'https://a2.com', userId: a.id },
    })
    await prisma.shortLink.create({
      data: { title: 'B1', url: 'https://b1.com', userId: b.id },
    })

    const res = await getJson('/api/short-links', a.cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data.map((l: { title: string }) => l.title).sort()).toEqual([
      'A1',
      'A2',
    ])
  })
})

describe('POST /api/short-links', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/short-links`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ title: 'X', url: 'https://x.com' }),
    })
    expect(res.status).toBe(401)
  })

  it('should return 422 when url is invalid', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/short-links',
      { title: 'X', url: 'not-a-url' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 when title is too short', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/short-links',
      { title: 'A', url: 'https://example.com' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should create short link bound to the user', async () => {
    const { id, cookie } = await createAuthenticatedUser()

    const res = await postJson(
      '/api/short-links',
      { title: 'Docs', url: 'https://docs.example.com' },
      cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.title).toBe('Docs')
    expect(body.data.userId).toBe(id)
  })
})
