import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  seedProjectUpdate,
  seedUpdateReply,
} from '@/src/__tests__/factories/update.factory'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

async function setup(
  overrides: { updatesEnabled?: boolean; isPublic?: boolean } = {},
) {
  const { user, workspace } = await authenticatedOwner()
  const project = await seedProject(workspace.id, user.id, {
    isPublic: true,
    updatesEnabled: true,
    ...overrides,
  })
  const update = await seedProjectUpdate(project.id, user.id)
  return { owner: user, workspace, project, update }
}

const url = (workspaceId: string, slug: string, id: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/updates/${id}/replies`

describe('POST /api/workspaces/[id]/projects/[slug]/updates/[updateId]/replies', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (await postJson('/api/workspaces/ws/projects/p/updates/u/replies', {}))
        .status,
    ).toBe(401)
  })

  it('returns 403 UPDATE_FORBIDDEN to a workspace VIEWER', async () => {
    const { workspace, project, update } = await setup()
    const viewer = await addMember(workspace.id, 'VIEWER')

    const res = await postJson(
      url(workspace.id, project.slug, update.id),
      { content: 'Valeu' },
      viewer.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('lets a workspace MEMBER reply', async () => {
    const { workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      url(workspace.id, project.slug, update.id),
      { content: 'Valeu' },
      member.cookie,
    )

    expect(res.status).toBe(201)
    expect((await res.json()).data).toMatchObject({
      content: 'Valeu',
      updateId: update.id,
      author: { id: member.id },
    })
  })

  it('returns 403 to someone outside the workspace', async () => {
    const { workspace, project, update } = await setup()
    const stranger = await createAuthenticatedUser()

    expect(
      (
        await postJson(
          url(workspace.id, project.slug, update.id),
          { content: 'x' },
          stranger.cookie,
        )
      ).status,
    ).toBe(403)
  })

  it('returns 422 for an empty or oversized reply', async () => {
    const { owner, workspace, project, update } = await setup()
    const path = url(workspace.id, project.slug, update.id)

    expect(
      (await postJson(path, { content: '   ' }, owner.cookie)).status,
    ).toBe(422)
    expect(
      (await postJson(path, { content: 'x'.repeat(2001) }, owner.cookie))
        .status,
    ).toBe(422)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })

    const res = await postJson(
      url(workspace.id, project.slug, update.id),
      { content: 'x' },
      owner.cookie,
    )

    expect(res.status).toBe(409)
  })

  it('returns 404 for an unknown update', async () => {
    const { owner, workspace, project } = await setup()

    expect(
      (
        await postJson(
          url(workspace.id, project.slug, 'nope'),
          { content: 'x' },
          owner.cookie,
        )
      ).status,
    ).toBe(404)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/updates/[updateId]/replies', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (await getJson('/api/workspaces/ws/projects/p/updates/u/replies')).status,
    ).toBe(401)
  })

  it('returns 403 to someone outside the workspace', async () => {
    const { workspace, project, update } = await setup()
    const stranger = await createAuthenticatedUser()

    const res = await getJson(
      url(workspace.id, project.slug, update.id),
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown update', async () => {
    const { owner, workspace, project } = await setup()

    const res = await getJson(
      url(workspace.id, project.slug, 'nope'),
      owner.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })

    const res = await getJson(
      url(workspace.id, project.slug, update.id),
      owner.cookie,
    )

    expect(res.status).toBe(409)
  })

  it('lists the replies oldest first', async () => {
    const { owner, workspace, project, update } = await setup()
    await seedUpdateReply(update.id, owner.id, {
      content: 'segunda',
      createdAt: new Date('2026-01-02T00:00:00Z'),
    })
    await seedUpdateReply(update.id, owner.id, {
      content: 'primeira',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    const res = await getJson(
      url(workspace.id, project.slug, update.id),
      owner.cookie,
    )

    expect(res.status).toBe(200)
    expect(
      (await res.json()).data.map((r: { content: string }) => r.content),
    ).toEqual(['primeira', 'segunda'])
  })
})

describe('PATCH and DELETE /api/workspaces/[id]/projects/[slug]/updates/[updateId]/replies', () => {
  it('returns 401 when unauthenticated', async () => {
    const path = '/api/workspaces/ws/projects/p/updates/u/replies/r'

    expect((await patchJson(path, {})).status).toBe(401)
    expect((await deleteJson(path)).status).toBe(401)
  })

  it('returns 422 for an empty or oversized edit', async () => {
    const { owner, workspace, project, update } = await setup()
    const reply = await seedUpdateReply(update.id, owner.id)
    const path = `${url(workspace.id, project.slug, update.id)}/${reply.id}`

    expect(
      (await patchJson(path, { content: '   ' }, owner.cookie)).status,
    ).toBe(422)
    expect(
      (await patchJson(path, { content: 'x'.repeat(2001) }, owner.cookie))
        .status,
    ).toBe(422)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })
    const reply = await seedUpdateReply(update.id, owner.id)
    const path = `${url(workspace.id, project.slug, update.id)}/${reply.id}`

    expect((await patchJson(path, { content: 'x' }, owner.cookie)).status).toBe(
      409,
    )
    expect((await deleteJson(path, owner.cookie)).status).toBe(409)
  })

  it('lets the author edit, stamping editedAt', async () => {
    const { workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')
    const reply = await seedUpdateReply(update.id, member.id)

    const res = await patchJson(
      `${url(workspace.id, project.slug, update.id)}/${reply.id}`,
      { content: 'Corrigido' },
      member.cookie,
    )

    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.content).toBe('Corrigido')
    expect(data.editedAt).not.toBeNull()
  })

  it("does not let an OWNER edit someone else's reply", async () => {
    const { owner, workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')
    const reply = await seedUpdateReply(update.id, member.id)

    const res = await patchJson(
      `${url(workspace.id, project.slug, update.id)}/${reply.id}`,
      { content: 'x' },
      owner.cookie,
    )

    expect(res.status).toBe(403)
  })

  it("lets the OWNER delete someone else's reply, but not another member", async () => {
    const { owner, workspace, project, update } = await setup()
    const author = await addMember(workspace.id, 'MEMBER')
    const bystander = await addMember(workspace.id, 'MEMBER')
    const reply = await seedUpdateReply(update.id, author.id)
    const path = `${url(workspace.id, project.slug, update.id)}/${reply.id}`

    expect((await deleteJson(path, bystander.cookie)).status).toBe(403)
    expect((await deleteJson(path, owner.cookie)).status).toBe(200)
  })

  it('returns 404 for a reply of another update', async () => {
    const { owner, workspace, project, update } = await setup()
    const otherUpdate = await seedProjectUpdate(project.id, owner.id)
    const reply = await seedUpdateReply(otherUpdate.id, owner.id)

    const res = await deleteJson(
      `${url(workspace.id, project.slug, update.id)}/${reply.id}`,
      owner.cookie,
    )

    expect(res.status).toBe(404)
  })
})
