import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function seedShortLinkFor(userId: string) {
  return prisma.shortLink.create({
    data: {
      title: 'E2E Link',
      url: `https://example.com/${userId.slice(0, 6)}`,
      userId,
    },
  })
}

describe('PATCH /api/short-links/[id]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/short-links/some-id', { title: 'X' })
    expect(res.status).toBe(401)
  })

  it('should return 403 when actor is not the owner', async () => {
    const [owner, stranger] = await Promise.all([
      createAuthenticatedUser(),
      createAuthenticatedUser(),
    ])
    const link = await seedShortLinkFor(owner.id)

    const res = await patchJson(
      `/api/short-links/${link.id}`,
      { title: 'Hijack' },
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 422 for invalid url', async () => {
    const owner = await createAuthenticatedUser()
    const link = await seedShortLinkFor(owner.id)

    const res = await patchJson(
      `/api/short-links/${link.id}`,
      { url: 'invalid' },
      owner.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should allow owner to update', async () => {
    const owner = await createAuthenticatedUser()
    const link = await seedShortLinkFor(owner.id)

    const res = await patchJson(
      `/api/short-links/${link.id}`,
      { title: 'Renamed' },
      owner.cookie,
    )
    expect(res.status).toBe(200)

    const updated = await prisma.shortLink.findUnique({
      where: { id: link.id },
    })
    expect(updated?.title).toBe('Renamed')
  })
})

describe('DELETE /api/short-links/[id]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await deleteJson('/api/short-links/some-id')
    expect(res.status).toBe(401)
  })

  it('should return 403 when actor is not the owner', async () => {
    const [owner, stranger] = await Promise.all([
      createAuthenticatedUser(),
      createAuthenticatedUser(),
    ])
    const link = await seedShortLinkFor(owner.id)

    const res = await deleteJson(`/api/short-links/${link.id}`, stranger.cookie)
    expect(res.status).toBe(403)
  })

  it('should allow owner to delete', async () => {
    const owner = await createAuthenticatedUser()
    const link = await seedShortLinkFor(owner.id)

    const res = await deleteJson(`/api/short-links/${link.id}`, owner.cookie)
    expect(res.status).toBe(200)

    const found = await prisma.shortLink.findUnique({ where: { id: link.id } })
    expect(found).toBeNull()
  })
})
