import { describe, expect, it } from 'vitest'
import { seedProjectWithDefaults as seedProject } from '@/src/__tests__/factories/project.factory'
import {
  authenticatedOwner,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

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
