import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedProjectUpdate } from '@/src/__tests__/factories/update.factory'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  getJson,
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
  return { owner: user, workspace, project }
}

const url = (workspaceId: string, slug: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/updates`

describe('GET /api/workspaces/[id]/projects/[slug]/updates', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (await getJson('/api/workspaces/ws/projects/p/updates')).status,
    ).toBe(401)
  })

  it('returns 403 to someone outside the workspace', async () => {
    const { workspace, project } = await setup()
    const stranger = await createAuthenticatedUser()

    const res = await getJson(url(workspace.id, project.slug), stranger.cookie)

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown project', async () => {
    const { owner, workspace } = await setup()

    const res = await getJson(url(workspace.id, 'nope'), owner.cookie)

    expect(res.status).toBe(404)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project } = await setup({ updatesEnabled: false })

    const res = await getJson(url(workspace.id, project.slug), owner.cookie)

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('UPDATE_DISABLED')
  })

  it('lists the updates newest first, with reactions and reply count', async () => {
    const { owner, workspace, project } = await setup()
    await seedProjectUpdate(project.id, owner.id, {
      content: 'antigo',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    await seedProjectUpdate(project.id, owner.id, {
      content: 'recente',
      createdAt: new Date('2026-01-02T00:00:00Z'),
    })

    const res = await getJson(url(workspace.id, project.slug), owner.cookie)

    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.updates.map((u: { content: string }) => u.content)).toEqual([
      'recente',
      'antigo',
    ])
    expect(data.updates[0]).toMatchObject({ replyCount: 0, reactions: [] })
    expect(data.nextCursor).toBeNull()
  })

  it('pages with ?limit and ?cursor', async () => {
    const { owner, workspace, project } = await setup()
    for (let i = 0; i < 3; i++) {
      await seedProjectUpdate(project.id, owner.id, {
        content: `u${i}`,
        createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
      })
    }

    const first = await (
      await getJson(`${url(workspace.id, project.slug)}?limit=2`, owner.cookie)
    ).json()
    const second = await (
      await getJson(
        `${url(workspace.id, project.slug)}?limit=2&cursor=${first.data.nextCursor}`,
        owner.cookie,
      )
    ).json()

    expect(first.data.updates).toHaveLength(2)
    expect(first.data.nextCursor).not.toBeNull()
    expect(
      second.data.updates.map((u: { content: string }) => u.content),
    ).toEqual(['u0'])
    expect(second.data.nextCursor).toBeNull()
  })

  it('returns 422 for a limit over 50', async () => {
    const { owner, workspace, project } = await setup()

    const res = await getJson(
      `${url(workspace.id, project.slug)}?limit=51`,
      owner.cookie,
    )

    expect(res.status).toBe(422)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/updates', () => {
  it('returns 401 when unauthenticated', async () => {
    expect(
      (await postJson('/api/workspaces/ws/projects/p/updates', {})).status,
    ).toBe(401)
  })

  it('creates an update and returns it', async () => {
    const { owner, workspace, project } = await setup()

    const res = await postJson(
      url(workspace.id, project.slug),
      { status: 'AT_RISK', content: 'Atrasado' },
      owner.cookie,
    )

    expect(res.status).toBe(201)
    const { data } = await res.json()
    expect(data).toMatchObject({
      projectId: project.id,
      issueId: null,
      status: 'AT_RISK',
      content: 'Atrasado',
      replyCount: 0,
      reactions: [],
      author: { id: owner.id },
    })
  })

  it('accepts a status alone', async () => {
    const { owner, workspace, project } = await setup()

    const res = await postJson(
      url(workspace.id, project.slug),
      { status: 'ON_TRACK' },
      owner.cookie,
    )

    expect(res.status).toBe(201)
    expect((await res.json()).data.content).toBeNull()
  })

  it('returns 422 for an unknown status or content over 2000 characters', async () => {
    const { owner, workspace, project } = await setup()
    const path = url(workspace.id, project.slug)

    expect(
      (await postJson(path, { status: 'DONE' }, owner.cookie)).status,
    ).toBe(422)
    expect(
      (
        await postJson(
          path,
          { status: 'ON_TRACK', content: 'x'.repeat(2001) },
          owner.cookie,
        )
      ).status,
    ).toBe(422)
  })

  it.each([
    'MEMBER',
    'VIEWER',
  ] as const)('returns 403 UPDATE_FORBIDDEN to a workspace %s who does not lead', async (role) => {
    const { workspace, project } = await setup()
    const member = await addMember(workspace.id, role)

    const res = await postJson(
      url(workspace.id, project.slug),
      { status: 'ON_TRACK' },
      member.cookie,
    )

    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('UPDATE_FORBIDDEN')
  })

  it('lets an ADMIN who does not lead post', async () => {
    const { workspace, project } = await setup()
    const admin = await addMember(workspace.id, 'ADMIN')

    const res = await postJson(
      url(workspace.id, project.slug),
      { status: 'ON_TRACK' },
      admin.cookie,
    )

    expect(res.status).toBe(201)
  })

  it('lets the project lead post even as a plain MEMBER', async () => {
    const { owner, workspace } = await setup()
    const lead = await addMember(workspace.id, 'MEMBER')
    const project = await seedProject(workspace.id, lead.id, {
      updatesEnabled: true,
    })

    const res = await postJson(
      url(workspace.id, project.slug),
      { status: 'ON_TRACK' },
      lead.cookie,
    )

    expect(res.status).toBe(201)
    expect(owner.id).not.toBe(lead.id)
  })

  it('returns 404 for an unknown project', async () => {
    const { owner, workspace } = await setup()

    const res = await postJson(
      url(workspace.id, 'nope'),
      { status: 'ON_TRACK' },
      owner.cookie,
    )

    expect(res.status).toBe(404)
  })

  it('returns 409 UPDATE_DISABLED while the project has updates off', async () => {
    const { owner, workspace, project } = await setup({ updatesEnabled: false })

    const res = await postJson(
      url(workspace.id, project.slug),
      { status: 'ON_TRACK' },
      owner.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('UPDATE_DISABLED')
  })
})
