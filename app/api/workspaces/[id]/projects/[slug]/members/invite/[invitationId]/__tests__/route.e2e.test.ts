import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function createProject(workspaceId: string, cookie: string) {
  const slug = `p-${createId().slice(0, 8)}`
  const res = await postJson(
    `/api/workspaces/${workspaceId}/projects`,
    { name: 'Proj', slug },
    cookie,
  )
  const { data } = await res.json()
  return data as { id: string; slug: string }
}

async function inviteExternal(
  workspaceId: string,
  slug: string,
  cookie: string,
) {
  const email = `ext-${createId().slice(0, 8)}@example.com`
  await postJson(
    `/api/workspaces/${workspaceId}/projects/${slug}/members/invite`,
    { email },
    cookie,
  )
  return prisma.workspaceInvitation.findFirstOrThrow({
    where: { workspaceId, email },
  })
}

describe('DELETE /api/workspaces/[id]/projects/[slug]/members/invite/[invitationId]', () => {
  it('should return 403 for a plain member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const invite = await inviteExternal(workspace.id, project.slug, user.cookie)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite/${invite.id}`,
      member.cookie,
    )
    expect(res.status).toBe(403)
  })

  it('should return 404 when the invite belongs to another project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const projectA = await createProject(workspace.id, user.cookie)
    const projectB = await createProject(workspace.id, user.cookie)
    const invite = await inviteExternal(
      workspace.id,
      projectA.slug,
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${projectB.slug}/members/invite/${invite.id}`,
      user.cookie,
    )
    expect(res.status).toBe(404)
  })

  it('should revoke a pending project invite (200)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await createProject(workspace.id, user.cookie)
    const invite = await inviteExternal(workspace.id, project.slug, user.cookie)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/members/invite/${invite.id}`,
      user.cookie,
    )
    expect(res.status).toBe(200)

    const after = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: invite.id },
    })
    expect(after.status).toBe('REVOKED')
  })
})
