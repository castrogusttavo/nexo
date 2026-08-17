import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'

describe('PATCH /api/workspaces/[id]/projects/[slug]/states/[stateId]', () => {
  it('should return 403 when non-lead MEMBER tries to update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states/${state.id}`,
      { name: 'Renamed' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to rename a state', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states/${state.id}`,
      { name: 'Renamed' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Renamed')
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/states/[stateId]', () => {
  it('should return 409 when it is the last state in the group', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id, { group: 'STARTED' })

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states/${state.id}`,
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('STATE_LAST_IN_GROUP')
  })

  it('should return 409 when deleting the default state', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await seedState(project.id, { group: 'STARTED' })
    const defautlState = await seedState(project.id, {
      group: 'STARTED',
      isDefault: true,
    })

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states/${defautlState.id}`,
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('STATE_IS_DEFAULT')
  })

  it('should delete when there is another state in the group', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    await seedState(project.id, { group: 'STARTED' })
    const state = await seedState(project.id, { group: 'STARTED' })

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/states/${state.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })
})
