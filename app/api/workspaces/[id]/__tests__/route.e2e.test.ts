import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  deleteJson,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

describe('GET /api/workspaces/[id]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/some-id')
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a member', async () => {
    const [{ workspace }, stranger] = await Promise.all([
      authenticatedOwner(),
      createAuthenticatedUser(),
    ])

    const res = await getJson(
      `/api/workspaces/${workspace.id}`,
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return workspace for OWNER', async () => {
    const { user, workspace } = await authenticatedOwner({ name: 'Alpha' })

    const res = await getJson(`/api/workspaces/${workspace.id}`, user.cookie)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(workspace.id)
    expect(body.data.name).toBe('Alpha')
  })

  it('should return workspace for MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(`/api/workspaces/${workspace.id}`, member.cookie)
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/workspaces/[id]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/workspaces/some-id', { name: 'X' })
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-member', async () => {
    const [{ workspace }, stranger] = await Promise.all([
      authenticatedOwner(),
      createAuthenticatedUser(),
    ])

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { name: 'Hijack' },
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 403 for MEMBER role', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { name: 'Nope' },
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 403 for VIEWER role', async () => {
    const { workspace } = await authenticatedOwner()
    const viewer = await addMember(workspace.id, 'VIEWER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { name: 'Nope' },
      viewer.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should allow ADMIN to update', async () => {
    const { workspace } = await authenticatedOwner()
    const admin = await addMember(workspace.id, 'ADMIN')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { name: 'Renamed By Admin' },
      admin.cookie,
    )
    expect(res.status).toBe(200)
    const ws = await prisma.workspace.findUnique({
      where: { id: workspace.id },
    })
    expect(ws?.name).toBe('Renamed By Admin')
  })

  it('should allow OWNER to update', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { name: 'Renamed By Owner' },
      user.cookie,
    )
    expect(res.status).toBe(200)
  })

  it('should return 422 for invalid slug', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { slug: 'BAD SLUG' },
      user.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 409 when updating to a taken slug', async () => {
    const taken = `taken-${createId().slice(0, 6)}`
    const ownerA = await createAuthenticatedUser()
    await prisma.workspace.create({
      data: { name: 'A', slug: taken, activePlan: 'FREE' },
    })
    const targetSlug = `mov-${createId().slice(0, 6)}`
    const ownerB = await createAuthenticatedUser()
    const target = await prisma.workspace.create({
      data: { name: 'B', slug: targetSlug, activePlan: 'FREE' },
    })
    await prisma.membership.create({
      data: { userId: ownerB.id, workspaceId: target.id, role: 'OWNER' },
    })
    void ownerA

    const res = await patchJson(
      `/api/workspaces/${target.id}`,
      { slug: taken },
      ownerB.cookie,
    )
    expect(res.status).toBe(409)
  })

  it('should let the OWNER turn the project states off', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { projectStatesEnabled: false },
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data.projectStatesEnabled).toBe(false)
    const stored = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    })
    expect(stored.projectStatesEnabled).toBe(false)
  })

  it('should not let a MEMBER flip the project states switch', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { projectStatesEnabled: false },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/workspaces/[id] project labels switch', () => {
  it('should let the OWNER turn the project labels off', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { projectLabelsEnabled: false },
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data.projectLabelsEnabled).toBe(false)
    const stored = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    })
    expect(stored.projectLabelsEnabled).toBe(false)
  })

  it('should not let a MEMBER flip the project labels switch', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}`,
      { projectLabelsEnabled: false },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/workspaces/[id]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await deleteJson('/api/workspaces/some-id')
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-member', async () => {
    const [{ workspace }, stranger] = await Promise.all([
      authenticatedOwner(),
      createAuthenticatedUser(),
    ])

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}`,
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 403 for ADMIN (only OWNER can delete)', async () => {
    const { workspace } = await authenticatedOwner()
    const admin = await addMember(workspace.id, 'ADMIN')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}`,
      admin.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should allow OWNER to delete', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await deleteJson(`/api/workspaces/${workspace.id}`, user.cookie)
    expect(res.status).toBe(200)

    const ws = await prisma.workspace.findUnique({
      where: { id: workspace.id },
    })
    expect(ws).toBeNull()
  })
})
