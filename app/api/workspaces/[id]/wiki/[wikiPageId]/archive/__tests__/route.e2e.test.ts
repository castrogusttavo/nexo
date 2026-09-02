import { describe, expect, it } from 'vitest'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import {
  authenticatedOwner,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

describe('PATCH /api/workspaces/[id]/wiki/[wikiPageId]/archive', () => {
  it('should archive the page and drop it from the listing', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/archive`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.archivedAt).not.toBeNull()

    const list = await getJson(
      `/api/workspaces/${workspace.id}/wiki`,
      user.cookie,
    )
    const listBody = await list.json()
    expect(
      listBody.data.find((p: { id: string }) => p.id === page.id),
    ).toBeUndefined()
  })

  it('should return 403 for a page in another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const other = await authenticatedOwner()
    const page = await seedWikiPage(other.workspace.id, other.user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/archive`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(403)
  })
})
