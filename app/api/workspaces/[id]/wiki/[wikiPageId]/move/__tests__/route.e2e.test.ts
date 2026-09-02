import { describe, expect, it } from 'vitest'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import { authenticatedOwner, patchJson } from '@/src/__tests__/helpers/e2e'

describe('PATCH /api/workspaces/[id]/wiki/[wikiPageId]/move', () => {
  it('should move a page under a new parent', async () => {
    const { user, workspace } = await authenticatedOwner()
    const parent = await seedWikiPage(workspace.id, user.id, {
      title: 'Parent',
    })
    const page = await seedWikiPage(workspace.id, user.id, { title: 'Child' })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/move`,
      { parentId: parent.id, position: 0 },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.parentId).toBe(parent.id)
  })

  it('should reject moving a page under itself', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/move`,
      { parentId: page.id, position: 0 },
      user.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 422 when position is missing', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/move`,
      { parentId: null },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })
})
