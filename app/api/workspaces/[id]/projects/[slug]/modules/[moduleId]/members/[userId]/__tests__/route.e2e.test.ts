import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { authenticatedOwner, deleteJson } from '@/src/__tests__/helpers/e2e'
import { ModuleRepository } from '@/src/repositories/module.repository'

async function seedModule(projectId: string, leadId: string) {
  const result = await ModuleRepository.create({
    name: 'Auth',
    leadId,
    projectId,
  })
  if (!result.ok) throw new Error('failed to seed module')
  return result.value
}

describe('DELETE /api/workspaces/[id]/projects/[slug]/modules/[moduleId]/members/[userId]', () => {
  it('should return 403 when trying to remove the module lead', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const module = await seedModule(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules/${module.id}/members/${user.id}`,
      user.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to delete a module', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const module = await seedModule(project.id, user.id)
    const other = await authenticatedOwner()
    await ModuleRepository.addMember(other.user.id, module.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/modules/${module.id}/members/${other.user.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })
})
