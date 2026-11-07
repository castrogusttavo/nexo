import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedProjectUpdate } from '@/src/__tests__/factories/update.factory'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  deleteJson,
  getJson,
  putJson,
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

const url = (workspaceId: string, slug: string, id: string, emoji: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/updates/${id}/reactions/${encodeURIComponent(emoji)}`

async function reactionsOf(ws: string, slug: string, cookie: string) {
  const res = await getJson(
    `/api/workspaces/${ws}/projects/${slug}/updates`,
    cookie,
  )
  return (await res.json()).data.updates[0].reactions
}

describe('PUT /api/workspaces/[id]/projects/[slug]/updates/[updateId]/reactions/[emoji]', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (
        await putJson(
          '/api/workspaces/ws/projects/p/updates/u/reactions/%F0%9F%91%8D',
        )
      ).status,
    ).toBe(401)
  })

  it("records a reaction that shows in the list as the viewer's", async () => {
    const { owner, workspace, project, update } = await setup()

    const res = await putJson(
      url(workspace.id, project.slug, update.id, '👍'),
      undefined,
      owner.cookie,
    )

    expect(res.status).toBe(200)
    expect(await reactionsOf(workspace.id, project.slug, owner.cookie)).toEqual(
      [{ emoji: '👍', count: 1, reactedByMe: true }],
    )
  })

  it('is idempotent: the same call twice counts once', async () => {
    const { owner, workspace, project, update } = await setup()
    const path = url(workspace.id, project.slug, update.id, '👍')

    await putJson(path, undefined, owner.cookie)
    await putJson(path, undefined, owner.cookie)

    expect(await reactionsOf(workspace.id, project.slug, owner.cookie)).toEqual(
      [{ emoji: '👍', count: 1, reactedByMe: true }],
    )
  })

  it('counts several people, and each sees only their own as reactedByMe', async () => {
    const { owner, workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')
    const path = url(workspace.id, project.slug, update.id, '👍')

    await putJson(path, undefined, owner.cookie)
    await putJson(path, undefined, member.cookie)

    expect(await reactionsOf(workspace.id, project.slug, owner.cookie)).toEqual(
      [{ emoji: '👍', count: 2, reactedByMe: true }],
    )
    const stranger = await addMember(workspace.id, 'MEMBER')
    expect(
      await reactionsOf(workspace.id, project.slug, stranger.cookie),
    ).toEqual([{ emoji: '👍', count: 2, reactedByMe: false }])
  })

  it('returns 422 when the path is not a single emoji', async () => {
    const { owner, workspace, project, update } = await setup()

    for (const bad of ['abc', '👍👍', '1']) {
      const res = await putJson(
        url(workspace.id, project.slug, update.id, bad),
        undefined,
        owner.cookie,
      )
      expect(res.status).toBe(422)
    }
  })

  it('returns 403 UPDATE_FORBIDDEN to a workspace VIEWER', async () => {
    const { workspace, project, update } = await setup()
    const viewer = await addMember(workspace.id, 'VIEWER')

    const res = await putJson(
      url(workspace.id, project.slug, update.id, '👍'),
      undefined,
      viewer.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('returns 403 to someone outside the workspace', async () => {
    const { workspace, project, update } = await setup()
    const stranger = await createAuthenticatedUser()

    const res = await putJson(
      url(workspace.id, project.slug, update.id, '👍'),
      undefined,
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })

    const res = await putJson(
      url(workspace.id, project.slug, update.id, '👍'),
      undefined,
      owner.cookie,
    )

    expect(res.status).toBe(409)
  })

  it('returns 404 for an unknown update', async () => {
    const { owner, workspace, project } = await setup()

    expect(
      (
        await putJson(
          url(workspace.id, project.slug, 'nope', '👍'),
          undefined,
          owner.cookie,
        )
      ).status,
    ).toBe(404)
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/updates/[updateId]/reactions/[emoji]', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (
        await deleteJson(
          '/api/workspaces/ws/projects/p/updates/u/reactions/%F0%9F%91%8D',
        )
      ).status,
    ).toBe(401)
  })

  it('returns 403 to someone outside the workspace', async () => {
    const { workspace, project, update } = await setup()
    const stranger = await createAuthenticatedUser()

    const res = await deleteJson(
      url(workspace.id, project.slug, update.id, '👍'),
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown update', async () => {
    const { owner, workspace, project } = await setup()

    const res = await deleteJson(
      url(workspace.id, project.slug, 'nope', '👍'),
      owner.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('returns 422 when the path is not a single emoji', async () => {
    const { owner, workspace, project, update } = await setup()

    for (const bad of ['abc', '👍👍', '1']) {
      const res = await deleteJson(
        url(workspace.id, project.slug, update.id, bad),
        owner.cookie,
      )
      expect(res.status).toBe(422)
    }
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })

    const res = await deleteJson(
      url(workspace.id, project.slug, update.id, '👍'),
      owner.cookie,
    )

    expect(res.status).toBe(409)
  })

  it("removes only the viewer's own reaction", async () => {
    const { owner, workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')
    const path = url(workspace.id, project.slug, update.id, '👍')
    await putJson(path, undefined, owner.cookie)
    await putJson(path, undefined, member.cookie)

    const res = await deleteJson(path, member.cookie)

    expect(res.status).toBe(200)
    expect(await reactionsOf(workspace.id, project.slug, owner.cookie)).toEqual(
      [{ emoji: '👍', count: 1, reactedByMe: true }],
    )
  })

  it('is idempotent: removing what is not there is a 200', async () => {
    const { owner, workspace, project, update } = await setup()

    const res = await deleteJson(
      url(workspace.id, project.slug, update.id, '👍'),
      owner.cookie,
    )

    expect(res.status).toBe(200)
  })
})
