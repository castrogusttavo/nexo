import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedLabel } from '@/src/__tests__/factories/label.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

describe('PATCH /api/workspaces/[id]/projects/[slug]/labels/[labelId]', () => {
  it('should return 403 when non-lead MEMBER tries to update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const label = await seedLabel(project.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels/${label.id}`,
      { name: 'Renamed' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to rename a label', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const label = await seedLabel(project.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels/${label.id}`,
      { name: 'Renamed' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Renamed')
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/labels/[labelId]', () => {
  it('should delete freely (no minimum-count rule)', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const label = await seedLabel(project.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/labels/${label.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })
})
