import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedProjectUpdate } from '@/src/__tests__/factories/update.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  getJson,
  patchJson,
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
  `/api/workspaces/${workspaceId}/projects/${slug}/updates/${id}`

describe('PATCH /api/workspaces/[id]/projects/[slug]/updates/[updateId]', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (await patchJson('/api/workspaces/ws/projects/p/updates/u', {})).status,
    ).toBe(401)
  })

  it('edits the update and stamps editedAt', async () => {
    const { owner, workspace, project, update } = await setup()

    const res = await patchJson(
      url(workspace.id, project.slug, update.id),
      { status: 'OFF_TRACK', content: 'Parou' },
      owner.cookie,
    )

    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data).toMatchObject({ status: 'OFF_TRACK', content: 'Parou' })
    expect(data.editedAt).not.toBeNull()
  })

  it('returns 403 UPDATE_FORBIDDEN to a member who did not write it', async () => {
    const { workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      url(workspace.id, project.slug, update.id),
      { status: 'ON_TRACK' },
      member.cookie,
    )

    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('UPDATE_FORBIDDEN')
  })

  it('returns 404 for an update of another project', async () => {
    const { owner, workspace, project } = await setup()
    const other = await seedProject(workspace.id, owner.id, {
      updatesEnabled: true,
    })
    const foreign = await seedProjectUpdate(other.id, owner.id)

    const res = await patchJson(
      url(workspace.id, project.slug, foreign.id),
      { status: 'ON_TRACK' },
      owner.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })

    const res = await patchJson(
      url(workspace.id, project.slug, update.id),
      { status: 'ON_TRACK' },
      owner.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('UPDATE_DISABLED')
  })

  it('returns 422 for an invalid body', async () => {
    const { owner, workspace, project, update } = await setup()

    const res = await patchJson(
      url(workspace.id, project.slug, update.id),
      { status: 'NOPE' },
      owner.cookie,
    )

    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/updates/[updateId]', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (await deleteJson('/api/workspaces/ws/projects/p/updates/u')).status,
    ).toBe(401)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project, update } = await setup({
      updatesEnabled: false,
    })

    const res = await deleteJson(
      url(workspace.id, project.slug, update.id),
      owner.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('UPDATE_DISABLED')
  })

  it('deletes the update and it leaves the list', async () => {
    const { owner, workspace, project, update } = await setup()

    const res = await deleteJson(
      url(workspace.id, project.slug, update.id),
      owner.cookie,
    )
    const list = await (
      await getJson(
        `/api/workspaces/${workspace.id}/projects/${project.slug}/updates`,
        owner.cookie,
      )
    ).json()

    expect(res.status).toBe(200)
    expect(list.data.updates).toEqual([])
  })

  it('lets an ADMIN delete what someone else wrote', async () => {
    const { workspace, project, update } = await setup()
    const admin = await addMember(workspace.id, 'ADMIN')

    expect(
      (
        await deleteJson(
          url(workspace.id, project.slug, update.id),
          admin.cookie,
        )
      ).status,
    ).toBe(200)
  })

  it('returns 403 to a member who did not write it', async () => {
    const { workspace, project, update } = await setup()
    const member = await addMember(workspace.id, 'MEMBER')

    expect(
      (
        await deleteJson(
          url(workspace.id, project.slug, update.id),
          member.cookie,
        )
      ).status,
    ).toBe(403)
  })

  it('returns 404 for an unknown update', async () => {
    const { owner, workspace, project } = await setup()

    expect(
      (await deleteJson(url(workspace.id, project.slug, 'nope'), owner.cookie))
        .status,
    ).toBe(404)
  })
})
