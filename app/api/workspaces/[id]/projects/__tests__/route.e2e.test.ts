import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  defaultHeaders,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
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

describe('GET /api/workspaces/[workspaceId]/projects', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/some-id/projects`, {
      headers: defaultHeaders,
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a workspace member', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await createAuthenticatedUser()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects`,
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return active projects for workspace member', async () => {
    const { user, workspace } = await authenticatedOwner()
    await seedProject(workspace.id, user.id, { isPublic: true })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
  })

  it('should hide private projects from non-members', async () => {
    const { user, workspace } = await authenticatedOwner()
    const slug = `private-${createId().slice(0, 6)}`
    await seedProject(workspace.id, user.id, { slug, isPublic: false })

    const member = await addMember(workspace.id, 'MEMBER')
    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects`,
      member.cookie,
    )

    const body = await res.json()
    expect(body.data.map((p: { slug: string }) => p.slug)).not.toContain(slug)
  })

  it('should show public projects to any workspace member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const slug = `public-${createId().slice(0, 6)}`
    await seedProject(workspace.id, user.id, { slug, isPublic: true })

    const member = await addMember(workspace.id, 'MEMBER')
    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects`,
      member.cookie,
    )

    const body = await res.json()
    expect(body.data.map((p: { slug: string }) => p.slug)).toContain(slug)
  })

  it('should return only archived projects when ?archived=true', async () => {
    const { user, workspace } = await authenticatedOwner()
    const activeSlug = `active-${createId().slice(0, 6)}`
    const archivedSlug = `archived-${createId().slice(0, 6)}`
    await seedProject(workspace.id, user.id, { slug: activeSlug })
    await seedProject(workspace.id, user.id, {
      slug: archivedSlug,
      archivedAt: new Date(),
    })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects?archived=true`,
      user.cookie,
    )

    const body = await res.json()
    const slugs = body.data.map((p: { slug: string }) => p.slug)
    expect(slugs).toContain(archivedSlug)
    expect(slugs).not.toContain(activeSlug)
  })
})

describe('POST /api/workspaces/[workspaceId]/projects', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/some-id/projects`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ name: 'P', slug: 'p1' }),
    })
    expect(res.status).toBe(401)
  })

  it('should return 403 when user is not a workspace member', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await createAuthenticatedUser()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects`,
      { name: 'Hack', slug: 'hack' },
      stranger.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 422 when name is missing', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects`,
      { slug: 'noop' },
      user.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 422 when slug is invalid', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects`,
      { name: 'Proj', slug: 'INVALID SLUG' },
      user.cookie,
    )
    expect(res.status).toBe(422)
  })

  it('should return 409 when slug is already taken in workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const slug = `dup${createId().slice(0, 6)}`
    await seedProject(workspace.id, user.id, { slug })

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects`,
      { name: 'New Project', slug },
      user.cookie,
    )

    expect(res.status).toBe(409)
  })

  it('should allow any workspace member to create a project', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects`,
      { name: 'Member Proj', slug: `mproj${createId().slice(0, 6)}` },
      member.cookie,
    )

    expect(res.status).toBe(201)
  })
})
