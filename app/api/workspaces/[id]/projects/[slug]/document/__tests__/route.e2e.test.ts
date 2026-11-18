import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
  putJson,
} from '@/src/__tests__/helpers/e2e'

const content = [{ type: 'p', children: [{ text: 'Documento' }] }]
const url = (workspaceId: string, slug: string) =>
  `/api/workspaces/${workspaceId}/projects/${slug}/document`

describe('GET/PUT /api/workspaces/[id]/projects/[slug]/document', () => {
  it('should return 401 when unauthenticated', async () => {
    expect((await getJson(url('ws', 'slug'))).status).toBe(401)
    expect((await putJson(url('ws', 'slug'), { content })).status).toBe(401)
  })

  it('should return an empty document before the first save', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await getJson(url(workspace.id, project.slug), user.cookie)

    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ content: [], updatedAt: null })
  })

  it('should save then read back the snapshot', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const put = await putJson(
      url(workspace.id, project.slug),
      { content },
      user.cookie,
    )
    expect(put.status).toBe(200)

    const get = await getJson(url(workspace.id, project.slug), user.cookie)
    const body = await get.json()
    expect(body.data.content).toEqual(content)
    expect(body.data.updatedAt).not.toBeNull()
  })

  it('should return 422 for an invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await putJson(
      url(workspace.id, project.slug),
      { content: 'texto' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 404 for an unknown project', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await getJson(url(workspace.id, 'nao-existe'), user.cookie)

    expect(res.status).toBe(404)
  })

  it('should return 403 on PUT for a workspace member who is not the lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await putJson(
      url(workspace.id, project.slug),
      { content },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 403 on GET for a non-member of a private project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(url(workspace.id, project.slug), member.cookie)

    expect(res.status).toBe(403)
  })
})
