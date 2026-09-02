import { describe, expect, it } from 'vitest'
import { seedWikiComment } from '@/src/__tests__/factories/wiki-comment.factory'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

describe('PATCH /api/workspaces/[id]/wiki/[wikiPageId]/comments/[commentId]', () => {
  it('should let the author edit their own comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const comment = await seedWikiComment(page.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}`,
      { content: [{ type: 'p', children: [{ text: 'Editado' }] }] },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.content).toEqual([
      { type: 'p', children: [{ text: 'Editado' }] },
    ])
  })

  it('should reject editing someone else comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const comment = await seedWikiComment(page.id, user.id)
    const member = await addMember(workspace.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}`,
      { content: [] },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/workspaces/[id]/wiki/[wikiPageId]/comments/[commentId]', () => {
  it('should let the author delete their own comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const comment = await seedWikiComment(page.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should let a privileged member delete someone else comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const member = await addMember(workspace.id)
    const comment = await seedWikiComment(page.id, member.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should reject a regular member deleting someone else comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const comment = await seedWikiComment(page.id, user.id)
    const member = await addMember(workspace.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}`,
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})
