import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  defaultHeaders,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

describe('GET /api/sticky-notes', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/sticky-notes`, {
      headers: defaultHeaders,
    })

    expect(res.status).toBe(401)
  })

  it('should return only the authenticated user stickies', async () => {
    const [a, b] = await Promise.all([
      createAuthenticatedUser(),
      createAuthenticatedUser(),
    ])
    await prisma.stickyNote.create({
      data: {
        userId: a.id,
        color: 'RED',
        content: { type: 'doc', content: [] },
      },
    })
    await prisma.stickyNote.create({
      data: {
        userId: a.id,
        color: 'BLUE',
        content: { type: 'doc', content: [] },
      },
    })
    await prisma.stickyNote.create({
      data: {
        userId: b.id,
        color: 'GREEN',
        content: { type: 'doc', content: [] },
      },
    })

    const res = await getJson('/api/sticky-notes', a.cookie)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data.map((s: { color: string }) => s.color).sort()).toEqual([
      'BLUE',
      'RED',
    ])
  })
})

describe('POST /api/sticky-notes', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/sticky-notes`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('should create sticky with defaults when body is empty', async () => {
    const { id, cookie } = await createAuthenticatedUser()

    const res = await postJson('/api/sticky-notes', {}, cookie)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.userId).toBe(id)
    expect(body.data.color).toBe('ZINC')
    expect(body.data.content).toEqual({ type: 'doc', content: [] })
  })

  it('should create a sticky with provided color and content', async () => {
    const { cookie } = await createAuthenticatedUser()
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
    }

    const res = await postJson(
      '/api/sticky-notes',
      { color: 'YELLOW', content },
      cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.color).toBe('YELLOW')
    expect(body.data.content).toEqual(content)
  })

  it('should return 422 when color is invalid', async () => {
    const { cookie } = await createAuthenticatedUser()

    const res = await postJson('/api/sticky-notes', { color: 'PINK' }, cookie)

    expect(res.status).toBe(422)
  })
})
