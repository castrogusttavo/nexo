import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { ModuleRepository } from '@/src/repositories/module.repository'
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

async function seedModule(projectId: string, leadId: string) {
  const result = await ModuleRepository.create({
    name: 'Auth',
    leadId,
    projectId,
  })
  if (!result.ok) throw new Error('failed to seed module')
  return result.value
}

describe('PATCH /api/workspaces/[id]/projects/[slug]/modules/[moduleId]', () => {
  it('should allow lead to update a module', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const module = await seedModule(project.id, user.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules/${module.id}`,
      { status: 'IN_PROGRESS', progress: 30 },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('IN_PROGRESS')
    expect(body.data.progress).toBe(30)
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/modules/[moduleId]', () => {
  it('should allow lead to delete a module', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const module = await seedModule(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules/${module.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })
})
