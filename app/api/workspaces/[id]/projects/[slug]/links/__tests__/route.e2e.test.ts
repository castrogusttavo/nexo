import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

const base = (ws: string, slug: string) =>
  `/api/workspaces/${ws}/projects/${slug}/links`

describe('/api/workspaces/[id]/projects/[slug]/links', () => {
  it('should return 401 when unauthenticated', async () => {
    expect((await getJson(base('ws', 's'))).status).toBe(401)
  })

  it('should create, list, edit and delete a link', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const url = base(workspace.id, project.slug)

    const created = await postJson(
      url,
      { url: 'https://nexopm.com', title: 'Site' },
      user.cookie,
    )
    expect(created.status).toBe(201)
    const link = (await created.json()).data

    const list = await (await getJson(url, user.cookie)).json()
    expect(list.data).toHaveLength(1)

    const patched = await patchJson(
      `${url}/${link.id}`,
      { title: null },
      user.cookie,
    )
    expect(patched.status).toBe(200)
    expect((await patched.json()).data.title).toBeNull()

    expect((await deleteJson(`${url}/${link.id}`, user.cookie)).status).toBe(
      200,
    )
    expect((await (await getJson(url, user.cookie)).json()).data).toEqual([])
  })

  it('should return 422 for a javascript: url', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      base(workspace.id, project.slug),
      { url: 'javascript:alert(1)' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 403 on POST for a workspace member who is not the lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      base(workspace.id, project.slug),
      { url: 'https://a.com' },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})
