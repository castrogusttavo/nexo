import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedProjectLabel } from '@/src/__tests__/factories/project-label.factory'
import { defaultProjectStateId } from '@/src/__tests__/factories/project-state.factory'
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
      identifier: createId().slice(0, 6).toUpperCase(),
      workspaceId,
      leadId,
      stateId: await defaultProjectStateId(workspaceId),
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

describe('PATCH /api/workspaces/[id]/projects/[slug] stateId', () => {
  function stateOf(workspaceId: string) {
    return prisma.projectState.findFirstOrThrow({
      where: { workspaceId, group: 'EXECUTION' },
    })
  }

  it('should let the lead move the project to another state', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const execution = await stateOf(workspace.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { stateId: execution.id },
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data.stateId).toBe(execution.id)
  })

  it('should return 422 PROJECT_STATE_INVALID for a state of another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const { workspace: other } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const foreign = await stateOf(other.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { stateId: foreign.id },
      user.cookie,
    )

    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('PROJECT_STATE_INVALID')
  })

  it('should return 409 PROJECT_STATES_DISABLED while the workspace switch is off', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const execution = await stateOf(workspace.id)
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { projectStatesEnabled: false },
    })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { stateId: execution.id },
      user.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('PROJECT_STATES_DISABLED')
  })

  it('should return 422 VALIDATION_ERROR for a malformed state id', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { stateId: 'not a cuid' },
      user.cookie,
    )

    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/workspaces/[id]/projects/[slug] labelIds', () => {
  it('should let the lead set and then clear the labels', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const a = await seedProjectLabel(workspace.id)
    const b = await seedProjectLabel(workspace.id)
    const url = `/api/workspaces/${workspace.id}/projects/${project.slug}`

    const set = await patchJson(
      url,
      { labelIds: [a.id, b.id, a.id] },
      user.cookie,
    )
    expect(set.status).toBe(200)
    expect([...(await set.json()).data.labelIds].sort()).toEqual(
      [a.id, b.id].sort(),
    )

    const cleared = await patchJson(url, { labelIds: [] }, user.cookie)
    expect(cleared.status).toBe(200)
    expect((await cleared.json()).data.labelIds).toEqual([])
  })

  it('should return 422 PROJECT_LABEL_INVALID for a label of another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const { workspace: other } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const foreign = await seedProjectLabel(other.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { labelIds: [foreign.id] },
      user.cookie,
    )

    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('PROJECT_LABEL_INVALID')
  })

  it('should return 409 PROJECT_LABELS_DISABLED while the workspace switch is off', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const label = await seedProjectLabel(workspace.id)
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { projectLabelsEnabled: false },
    })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { labelIds: [label.id] },
      user.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('PROJECT_LABELS_DISABLED')
  })

  it('should return 422 VALIDATION_ERROR for more than 20 labels', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { labelIds: Array.from({ length: 21 }, () => createId()) },
      user.cookie,
    )

    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/workspaces/[id]/projects/[slug] priority and dates', () => {
  it('should let the lead set the priority and both dates', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      {
        priority: 'URGENT',
        startDate: '2026-10-01T00:00:00.000Z',
        dueDate: '2026-12-31T00:00:00.000Z',
      },
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({
      priority: 'URGENT',
      startDate: '2026-10-01T00:00:00.000Z',
      dueDate: '2026-12-31T00:00:00.000Z',
    })
  })

  it('should return 422 VALIDATION_ERROR for a pair in the wrong order', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      {
        startDate: '2026-12-31T00:00:00.000Z',
        dueDate: '2026-10-01T00:00:00.000Z',
      },
      user.cookie,
    )

    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 422 PROJECT_DATE_RANGE_INVALID for a lone date crossing the stored one', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const url = `/api/workspaces/${workspace.id}/projects/${project.slug}`
    await patchJson(url, { startDate: '2026-12-01T00:00:00.000Z' }, user.cookie)

    const res = await patchJson(
      url,
      { dueDate: '2026-10-01T00:00:00.000Z' },
      user.cookie,
    )

    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('PROJECT_DATE_RANGE_INVALID')
  })

  it('should return 422 VALIDATION_ERROR for an unknown priority', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}`,
      { priority: 'CRITICAL' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })
})
