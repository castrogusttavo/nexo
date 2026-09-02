import { describe, expect, it } from 'vitest'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import {
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

describe('POST /api/workspaces/[id]/wiki', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/wiki', {})

    expect(res.status).toBe(401)
  })

  it('should create a root page with an empty title', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/wiki`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.workspaceId).toBe(workspace.id)
    expect(body.data.title).toBe('')
    expect(body.data.parentId).toBeNull()
  })

  it('should return 422 for a title over the length limit', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/wiki`,
      { title: 'x'.repeat(256) },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })
})

describe('GET /api/workspaces/[id]/wiki', () => {
  it('should list non-archived pages ordered by position', async () => {
    const { user, workspace } = await authenticatedOwner()
    await seedWikiPage(workspace.id, user.id, { title: 'B', position: 1 })
    await seedWikiPage(workspace.id, user.id, { title: 'A', position: 0 })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/wiki`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.map((p: { title: string }) => p.title)).toEqual(['A', 'B'])
  })
})
