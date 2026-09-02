import { describe, expect, it } from 'vitest'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

const content = [{ type: 'p', children: [{ text: 'Oi' }] }]

describe('POST /api/workspaces/[id]/wiki/[wikiPageId]/comments', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/wiki/page-1/comments', {})

    expect(res.status).toBe(401)
  })

  it('should return 422 when markId or content is missing', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should create a root comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'mark1', content },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.wikiPageId).toBe(page.id)
    expect(body.data.markId).toBe('mark1')
    expect(body.data.parentId).toBeNull()
    expect(body.data.author.id).toBe(user.id)
  })

  it('should create a reply joining the parent markId and reject replying to a reply', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    const root = await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'mark1', content },
      user.cookie,
    )
    const rootBody = await root.json()

    const reply = await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'different-mark', content, parentId: rootBody.data.id },
      user.cookie,
    )

    expect(reply.status).toBe(201)
    const replyBody = await reply.json()
    expect(replyBody.data.parentId).toBe(rootBody.data.id)
    expect(replyBody.data.markId).toBe('mark1')

    const nested = await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'mark1', content, parentId: replyBody.data.id },
      user.cookie,
    )

    const nestedBody = await nested.json()
    expect(nestedBody.error.code).toBe('WIKI_COMMENT_NESTING_TOO_DEEP')
  })

  it('should return WIKI_PAGE_FORBIDDEN for a stranger to the workspace', async () => {
    const { workspace } = await authenticatedOwner()
    const stranger = await (await authenticatedOwner()).user
    const page = await seedWikiPage(workspace.id, stranger.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'mark1', content },
      stranger.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('GET /api/workspaces/[id]/wiki/[wikiPageId]/comments', () => {
  it('should list comments with their authors', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'mark1', content },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].author.id).toBe(user.id)
  })

  it('should be visible to any workspace member, not just the author', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const member = await addMember(workspace.id)

    await postJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      { markId: 'mark1', content },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments`,
      member.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})
