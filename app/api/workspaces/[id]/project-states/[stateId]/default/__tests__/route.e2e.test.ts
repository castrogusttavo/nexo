import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

function stateOf(workspaceId: string, group: 'PLANNING') {
  return prisma.projectState.findFirstOrThrow({ where: { workspaceId, group } })
}

describe('PATCH /api/workspaces/[id]/project-states/[stateId]/default', () => {
  it('should make the state the only default of the workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const planning = await stateOf(workspace.id, 'PLANNING')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${planning.id}/default`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data.isDefault).toBe(true)
    const defaults = await prisma.projectState.findMany({
      where: { workspaceId: workspace.id, isDefault: true },
    })
    expect(defaults.map((s) => s.id)).toEqual([planning.id])
  })

  it('should return 403 to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const planning = await stateOf(workspace.id, 'PLANNING')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${planning.id}/default`,
      {},
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 404 for a state of another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const { workspace: other } = await authenticatedOwner()
    const foreign = await stateOf(other.id, 'PLANNING')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${foreign.id}/default`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
