import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  authenticatedOwner,
  deleteJson,
  getJson,
  putJson,
} from '@/src/__tests__/helpers/e2e'

const base = (ws: string, slug: string) =>
  `/api/workspaces/${ws}/projects/${slug}/reactions`

describe('/api/workspaces/[id]/projects/[slug]/reactions', () => {
  it('should return 401 when unauthenticated', async () => {
    expect((await getJson(base('ws', 's'))).status).toBe(401)
  })

  it('should react, count and unreact idempotently', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const url = base(workspace.id, project.slug)
    const emoji = encodeURIComponent('👍')

    expect(
      (await putJson(`${url}/${emoji}`, undefined, user.cookie)).status,
    ).toBe(200)
    expect(
      (await putJson(`${url}/${emoji}`, undefined, user.cookie)).status,
    ).toBe(200)

    const summary = (await (await getJson(url, user.cookie)).json()).data
    expect(summary).toEqual([{ emoji: '👍', count: 1, reactedByMe: true }])

    expect((await deleteJson(`${url}/${emoji}`, user.cookie)).status).toBe(200)
    expect((await deleteJson(`${url}/${emoji}`, user.cookie)).status).toBe(200)
    expect((await (await getJson(url, user.cookie)).json()).data).toEqual([])
  })

  it('should return 422 for something that is not a single emoji', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await putJson(
      `${base(workspace.id, project.slug)}/abc`,
      undefined,
      user.cookie,
    )

    expect(res.status).toBe(422)
  })
})
