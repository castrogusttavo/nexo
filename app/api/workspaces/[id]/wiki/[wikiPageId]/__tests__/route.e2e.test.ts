import { describe, expect, it } from 'vitest'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/wiki/[wikiPageId]', () => {
  it('should return the page for a workspace member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id, {
      title: 'Onboarding',
    })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.title).toBe('Onboarding')
  })

  it('should return 403 for a page in another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const other = await authenticatedOwner()
    const page = await seedWikiPage(other.workspace.id, other.user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}`,
      user.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/workspaces/[id]/wiki/[wikiPageId]', () => {
  it('should let any workspace member update the page', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const member = await addMember(workspace.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}`,
      { title: 'Updated by member' },
      member.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.title).toBe('Updated by member')
  })

  it('should return 422 for content over the size limit', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}`,
      { content: [{ type: 'p', children: [{ text: 'x'.repeat(150_000) }] }] },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })
})
