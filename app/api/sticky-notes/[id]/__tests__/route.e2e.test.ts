import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function seedStickyFor(userId: string) {
  return prisma.stickyNote.create({
    data: {
      userId,
      color: 'ZINC',
      content: { type: 'doc', content: [] },
    },
  })
}

describe('PATCH /api/sticky-notes/[id]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/sticky-notes/[id]', {})
    expect(res.status).toBe(401)
  })

  it('should return 403 when actor is not owner', async () => {
    const [owner, stranger] = await Promise.all([
      createAuthenticatedUser(),
      createAuthenticatedUser(),
    ])
    const sticky = await seedStickyFor(owner.id)

    const res = await patchJson(
      `/api/sticky-notes/${sticky.id}`,
      { color: 'RED' },
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 422 for invalid color', async () => {
    const owner = await createAuthenticatedUser()
    const sticky = await seedStickyFor(owner.id)

    const res = await patchJson(
      `/api/sticky-notes/${sticky.id}`,
      { color: 'INVALID' },
      owner.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should allow owner to update color', async () => {
    const owner = await createAuthenticatedUser()
    const sticky = await seedStickyFor(owner.id)

    const res = await patchJson(
      `/api/sticky-notes/${sticky.id}`,
      { color: 'BLUE' },
      owner.cookie,
    )

    expect(res.status).toBe(200)

    const updated = await prisma.stickyNote.findUnique({
      where: { id: sticky.id },
    })
    expect(updated?.color).toBe('BLUE')
  })

  it('should allow owner to update content', async () => {
    const owner = await createAuthenticatedUser()
    const sticky = await seedStickyFor(owner.id)
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'oi' }] }],
    }

    const res = await patchJson(
      `/api/sticky-notes/${sticky.id}`,
      { content },
      owner.cookie,
    )

    expect(res.status).toBe(200)

    const updated = await prisma.stickyNote.findUnique({
      where: { id: sticky.id },
    })
    expect(updated?.content).toEqual(content)
  })
})

describe('DELETE /api/sticky-notes/[id]', () => {
  it('should return 401 via middleware vhen unauthenticated', async () => {
    const res = await deleteJson('/api/sticky-notes/some-id')

    expect(res.status).toBe(401)
  })

  it('should return 403 when actor is not the owner', async () => {
    const [owner, stranger] = await Promise.all([
      createAuthenticatedUser(),
      createAuthenticatedUser(),
    ])
    const sticky = await seedStickyFor(owner.id)

    const res = await deleteJson(
      `/api/sticky-notes/${sticky.id}`,
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should allow owner to delete', async () => {
    const owner = await createAuthenticatedUser()
    const sticky = await seedStickyFor(owner.id)

    const res = await deleteJson(`/api/sticky-notes/${sticky.id}`, owner.cookie)
    expect(res.status).toBe(200)

    const found = await prisma.stickyNote.findUnique({
      where: { id: sticky.id },
    })
    expect(found).toBeNull()
  })
})
