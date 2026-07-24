import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  deleteJson,
  postJson,
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

describe('POST/DELETE /api/workspaces/[id]/projects/[slug]/modules/[moduleId]/favorite', () => {
  it('should favorite then unfavorite a module', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const module = await seedModule(project.id, user.id)

    const favRes = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules/${module.id}/favorite`,
      {},
      user.cookie,
    )

    expect(favRes.status).toBe(200)
    const favBody = await favRes.json()
    expect(favBody.data.favorited).toBe(true)

    const unfavRes = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules/${module.id}/favorite`,
      user.cookie,
    )

    expect(unfavRes.status).toBe(200)
    const unfavBody = await unfavRes.json()
    expect(unfavBody.data.favorited).toBe(false)
  })
})
