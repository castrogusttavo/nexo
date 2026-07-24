import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { CycleRepository } from '@/src/repositories/cycle.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedProject(workspaceId: string, leadId: string) {
  const result = await ProjectRepository.create({
    name: 'E2E Project',
    slug: `proj-${Math.random().toString(36).slice(2, 10)}`,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    leadId,
    workspaceId,
  })
  if (!result.ok) throw new Error('failed to seed project')
  return result.value
}

async function seedCycle(projectId: string, leadId: string) {
  const result = await CycleRepository.create({
    name: 'Sprint 1',
    leadId,
    projectId,
  })
  if (!result.ok) throw new Error('failed to seed cycle')
  return result.value
}

describe('PATCH /api/workspaces/[id]/projects/[slug]/cycles/[cycleId]', () => {
  it('should allow lead to update a cycle', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const cycle = await seedCycle(project.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles/${cycle.id}`,
      { status: 'IN_PROGRESS' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('IN_PROGRESS')
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/cycles/[cycleId]', () => {
  it('should allow lead to delete a cycle', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const cycle = await seedCycle(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles/${cycle.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })
})
