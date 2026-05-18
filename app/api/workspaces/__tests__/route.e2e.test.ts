import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  createAuthenticatedUser,
  createWorkspaceForUser,
  defaultHeaders,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

describe('POST /api/workspaces', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ name: 'Acme', slug: 'acme' }),
    })
    expect(res.status).toBe(401)
  })

  it('should return 422 when slug is invalid', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/workspaces',
      { name: 'Acme', slug: 'INVALID SLUG' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 when name is too short', async () => {
    const { cookie } = await createAuthenticatedUser()
    const res = await postJson(
      '/api/workspaces',
      { name: 'A', slug: 'acme' },
      cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 409 when slug is already taken', async () => {
    const dup = `dup-${createId().slice(0, 8)}`
    const owner = await createAuthenticatedUser()
    await createWorkspaceForUser(owner.id, { slug: dup })

    const other = await createAuthenticatedUser()
    const res = await postJson(
      '/api/workspaces',
      { name: 'Other', slug: dup },
      other.cookie,
    )
    expect(res.status).toBe(409)
  })

  it('should create workspace and OWNER membership on success', async () => {
    const { id, cookie } = await createAuthenticatedUser()
    const slug = `new-${createId().slice(0, 8)}`

    const res = await postJson(
      '/api/workspaces',
      { name: 'New WS', slug },
      cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe(slug)

    const membership = await prisma.membership.findFirst({
      where: { userId: id, workspace: { slug } },
    })
    expect(membership?.role).toBe('OWNER')
  })
})
