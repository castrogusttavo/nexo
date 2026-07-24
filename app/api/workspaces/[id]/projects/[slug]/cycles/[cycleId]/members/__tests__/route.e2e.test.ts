import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  getJson,
  postJson,
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

describe('GET /api/workspaces/[id]/projects/[slug]/cycles/[cycleId]/members', () => {
  it('should list the lead as the initial member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const cycle = await seedCycle(project.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles/${cycle.id}/members`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].isLead).toBe(true)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/cycles/[cycleId]/members', () => {
  it('should add a member to the cycle', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const cycle = await seedCycle(project.id, user.id)
    const other = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/cycles/${cycle.id}/members`,
      { userId: other.user.id },
      user.cookie,
    )

    expect(res.status).toBe(201)
  })
})
