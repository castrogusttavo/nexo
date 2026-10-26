import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  assignProjectLabels,
  seedProjectLabel,
} from '@/src/__tests__/factories/project-label.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

describe('PATCH /api/workspaces/[id]/project-labels/[labelId]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/workspaces/ws/project-labels/l', {})
    expect(res.status).toBe(401)
  })

  it('should let the OWNER rename and recolour a label', async () => {
    const { user, workspace } = await authenticatedOwner()
    const label = await seedProjectLabel(workspace.id, { name: 'Mkt' })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-labels/${label.id}`,
      { name: 'Marketing', color: 'YELLOW' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({
      name: 'Marketing',
      color: 'YELLOW',
    })
  })

  it('should return 422 for an invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()
    const label = await seedProjectLabel(workspace.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-labels/${label.id}`,
      { name: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 403 to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const label = await seedProjectLabel(workspace.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-labels/${label.id}`,
      { name: 'Hack' },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 404 for a label of another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const { workspace: other } = await authenticatedOwner()
    const foreign = await seedProjectLabel(other.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-labels/${foreign.id}`,
      { name: 'Hack' },
      user.cookie,
    )

    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('PROJECT_LABEL_NOT_FOUND')
  })
})

describe('DELETE /api/workspaces/[id]/project-labels/[labelId]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await deleteJson('/api/workspaces/ws/project-labels/l')
    expect(res.status).toBe(401)
  })

  it('should delete the label and take it off its projects', async () => {
    const { user, workspace } = await authenticatedOwner()
    const label = await seedProjectLabel(workspace.id)
    const project = await seedProject(workspace.id, user.id)
    await assignProjectLabels(project.id, [label.id])

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-labels/${label.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect(
      await prisma.projectLabelAssignment.count({
        where: { projectId: project.id },
      }),
    ).toBe(0)
  })

  it('should return 403 to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const label = await seedProjectLabel(workspace.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-labels/${label.id}`,
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 404 for a label of another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const { workspace: other } = await authenticatedOwner()
    const foreign = await seedProjectLabel(other.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-labels/${foreign.id}`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
