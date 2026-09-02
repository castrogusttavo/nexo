import { describe, expect, it } from 'vitest'
import { seedWikiComment } from '@/src/__tests__/factories/wiki-comment.factory'
import { seedWikiPage } from '@/src/__tests__/factories/wiki-page.factory'
import {
  addMember,
  authenticatedOwner,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

describe('PATCH /api/workspaces/[id]/wiki/[wikiPageId]/comments/[commentId]/resolve', () => {
  it('should let any workspace member resolve a root comment, not just its author', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const comment = await seedWikiComment(page.id, user.id)
    const member = await addMember(workspace.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}/resolve`,
      { resolved: true },
      member.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.resolved).toBe(true)
    expect(body.data.resolvedById).toBe(member.id)
  })

  it('should reject resolving a reply directly', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const root = await seedWikiComment(page.id, user.id)
    const reply = await seedWikiComment(page.id, user.id, {
      markId: root.markId,
      parentId: root.id,
    })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${reply.id}/resolve`,
      { resolved: true },
      user.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should clear resolvedById when unresolving', async () => {
    const { user, workspace } = await authenticatedOwner()
    const page = await seedWikiPage(workspace.id, user.id)
    const comment = await seedWikiComment(page.id, user.id, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedById: user.id,
    })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/wiki/${page.id}/comments/${comment.id}/resolve`,
      { resolved: false },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.resolved).toBe(false)
    expect(body.data.resolvedById).toBeNull()
  })
})
