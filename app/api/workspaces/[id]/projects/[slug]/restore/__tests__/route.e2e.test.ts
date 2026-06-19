import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

async function seedProject(
  workspaceId: string,
  leadId: string,
  opts?: { slug?: string; isPublic?: boolean; archivedAt?: Date | null },
) {
  return prisma.project.create({
    data: {
      name: 'E2E Project',
      slug: opts?.slug ?? `proj-${createId().slice(0, 8)}`,
      workspaceId,
      leadId,
      archivedAt: new Date(),
    },
  })
}

describe('PATCH /api/workspaces/[workspaceId]/projects/[slug]/restore', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/workspaces/ws/projects/slug/restore', {})
    expect(res.status).toBe(401)
  })

  it('should return 403 when non-lead MEMBER tries to restore', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/restore`,
      {},
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to restore archived project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/restore`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.archivedAt).toBeNull()

    const db = await prisma.project.findUnique({
      where: { id: project.id },
    })
    expect(db?.archivedAt).toBeNull()
  })

  it('should allow OWNER to restore any project', async () => {
    const { user: owner, workspace } = await authenticatedOwner()
    const lead = await addMember(workspace.id, 'MEMBER')
    const project = await seedProject(workspace.id, lead.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/restore`,
      {},
      owner.cookie,
    )

    expect(res.status).toBe(200)
  })
})
