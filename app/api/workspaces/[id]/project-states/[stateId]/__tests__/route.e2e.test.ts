import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedProjectState } from '@/src/__tests__/factories/project-state.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { prisma } from '@/src/lib/prisma'

function stateOf(workspaceId: string, group: 'DRAFT' | 'EXECUTION') {
  return prisma.projectState.findFirstOrThrow({ where: { workspaceId, group } })
}

describe('PATCH /api/workspaces/[id]/project-states/[stateId]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await patchJson('/api/workspaces/ws/project-states/s', {})

    expect(res.status).toBe(401)
  })

  it('should let the OWNER rename a state', async () => {
    const { user, workspace } = await authenticatedOwner()
    const state = await stateOf(workspace.id, 'EXECUTION')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${state.id}`,
      { name: 'Em andamento', color: 'BLUE' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({
      name: 'Em andamento',
      color: 'BLUE',
    })
  })

  it('should return 422 for an invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()
    const state = await stateOf(workspace.id, 'EXECUTION')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${state.id}`,
      { name: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should return 403 to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const state = await stateOf(workspace.id, 'EXECUTION')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${state.id}`,
      { name: 'Hack' },
      member.cookie,
    )

    expect(res.status).toBe(403)
  })

  it('should return 404 for a state of another workspace', async () => {
    const { user, workspace } = await authenticatedOwner()
    const { workspace: other } = await authenticatedOwner()
    const foreign = await stateOf(other.id, 'EXECUTION')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/project-states/${foreign.id}`,
      { name: 'Hack' },
      user.cookie,
    )

    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('PROJECT_STATE_NOT_FOUND')
  })
})

describe('DELETE /api/workspaces/[id]/project-states/[stateId]', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await deleteJson('/api/workspaces/ws/project-states/s')
    expect(res.status).toBe(401)
  })

  it('should return 409 PROJECT_STATE_IS_DEFAULT for the default state', async () => {
    const { user, workspace } = await authenticatedOwner()
    const draft = await stateOf(workspace.id, 'DRAFT')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-states/${draft.id}`,
      user.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('PROJECT_STATE_IS_DEFAULT')
  })

  it('should return 409 PROJECT_STATE_LAST_IN_GROUP for the only state of a group', async () => {
    const { user, workspace } = await authenticatedOwner()
    const execution = await stateOf(workspace.id, 'EXECUTION')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-states/${execution.id}`,
      user.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('PROJECT_STATE_LAST_IN_GROUP')
  })

  it('should move its projects to the other state of the group, then delete', async () => {
    const { user, workspace } = await authenticatedOwner()
    const execution = await stateOf(workspace.id, 'EXECUTION')
    const sibling = await seedProjectState(workspace.id, {
      name: 'Execução 2',
      group: 'EXECUTION',
      order: 1,
    })
    const project = await seedProject(workspace.id, user.id, {
      stateId: execution.id,
    })

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-states/${execution.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ movedTo: sibling.id, count: 1 })
    const after = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    })
    expect(after.stateId).toBe(sibling.id)
  })

  it('should return 403 to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')
    const execution = await stateOf(workspace.id, 'EXECUTION')

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/project-states/${execution.id}`,
      member.cookie,
    )

    expect(res.status).toBe(403)
  })
})
