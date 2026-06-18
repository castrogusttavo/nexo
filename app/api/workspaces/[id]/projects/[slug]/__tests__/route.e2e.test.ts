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

async function seedProject(
  workspaceId: string,
  leadId: string,
  opts?: { slug?: string; isPublic?: boolean; archivedAt?: Date | null },
) {
  return prisma.project.create({
    data: {
      name: 'E2E Project',
      slug: opts?.slug ?? `proj-${createId().slice(0, 8)}`,
      workspaceId,
      leadId,
      isPublic: opts?.isPublic ?? false,
      archivedAt: opts?.archivedAt ?? null,
    },
  })
}

describe('GET /api/workspaces/[workspaceId]/projects/[slug]', () => {
  it('should return 401 via middleware unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/projects/slug')
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-workspace-member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id, { isPublic: true })
    const stranger = await createAuthenticatedUser()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 404 for unknown slug', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/ghost-slug`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('should return public project to any workspace member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id, { isPublic: true })
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      member.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.slug).toBe(project.slug)
  })

  it('should return 403 for private project to non-member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id, {
      isPublic: false,
    })
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/workspaces/[workspaceId]/projects/[slug]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/workspaces/ws/projects/slug', {
      name: 'X',
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 for non-workspace-member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const stranger = await createAuthenticatedUser()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { name: 'Hijack' },
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 403 when non-lead MEMBER tries to update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { name: 'Hijack' },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 422 for invalid payload', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { slug: 'INVALID SLUG' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should allow lead to update project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { name: 'Renamed' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Renamed')
  })

  it('should return 409 when updating to a taken slug', async () => {
    const { user, workspace } = await authenticatedOwner()
    const existing = await seedProject(workspace.id, user.id, {
      slug: `taken${createId().slice(0, 6)}`,
    })
    const target = await seedProject(workspace.id, user.id, {
      slug: `taken${createId().slice(0, 6)}`,
    })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${target.slug}`,
      { slug: existing.slug },
      user.cookie,
    )

    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/workspaces/[workspaceId]/projects/[slug]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await deleteJson('/api/workspaces/ws/projects/slug')
    expect(res.status).toBe(401)
  })

  it('should return 403 for MEMBER (only OWNER can hard-delete)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should allow OWNER to hard-delete project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const deleted = await prisma.project.findUnique({
      where: { id: project.id },
    })
    expect(deleted).toBeNull()
  })
})
