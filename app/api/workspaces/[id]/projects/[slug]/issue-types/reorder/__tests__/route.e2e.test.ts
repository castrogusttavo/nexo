import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  authenticatedOwner,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedProject(workspaceId: string, leadId: string) {
  const result = await ProjectRepository.create({
    name: 'E2E Project',
    slug: `proj-${createId().slice(0, 8)}`,
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

describe('PATCH /api/workspaces/[id]/projects/[slug]/issue-types/reorder', () => {
  it('should persist the new order, including the seeded system types', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const listRes = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types`,
      user.cookie,
    )
    const listBody = await listRes.json()
    const [task, epic] = listBody.data

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issue-types/reorder`,
      { typeIds: [epic.id, task.id] },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.map((t: { id: string }) => t.id)).toEqual([
      epic.id,
      task.id,
    ])
  })
})
