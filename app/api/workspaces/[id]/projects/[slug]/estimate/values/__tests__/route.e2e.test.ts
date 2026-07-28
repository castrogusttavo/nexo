import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
  getJson,
  patchJson,
  postJson,
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

describe('POST /api/workspaces/[id]/projects/[slug]/estimate/values', () => {
  it('should return 403 when non-lead MEMBER tries to create', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values`,
      { value: '3' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
  })

  it('should allow lead to add a value', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values`,
      { value: '3' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.value).toBe('3')
  })
})

describe('PATCH .../estimate/values/[valueId]', () => {
  it('should update the value label', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values`,
      { value: '3' },
      user.cookie,
    )
    const { data } = await created.json()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values/${data.id}`,
      { value: '5' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.value).toBe('5')
  })
})

describe('DELETE .../estimate/values/[valueId]', () => {
  it('should return 409 when deleting the last remaining value', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)

    const settingsRes = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate`,
      { system: 'POINTS', model: 'FIBONACCI' },
      user.cookie,
    )
    const settingsBody = await settingsRes.json()
    const [onlyValue, ...rest] = settingsBody.data.values

    // Project creation seeds a full default Fibonacci scale, so the guard is
    // only exercised once every value but one has been removed.
    for (const value of rest) {
      await deleteJson(
        `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values/${value.id}`,
        user.cookie,
      )
    }

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values/${onlyValue.id}`,
      user.cookie,
    )

    expect(res.status).toBe(409)
  })
})

describe('PATCH .../estimate/values/reorder', () => {
  it('should persist the new order', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const first = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values`,
      { value: 'a' },
      user.cookie,
    )
    const second = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values`,
      { value: 'b' },
      user.cookie,
    )
    const firstBody = await first.json()
    const secondBody = await second.json()

    // Reordering only the two new values would tie their `order` with the
    // untouched seeded defaults, so send the full set like the frontend does.
    const settingsRes = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate`,
      user.cookie,
    )
    const settingsBody = await settingsRes.json()
    const defaultIds = settingsBody.data.values
      .map((v: { id: string }) => v.id)
      .filter(
        (id: string) => id !== firstBody.data.id && id !== secondBody.data.id,
      )

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/estimate/values/reorder`,
      { valueIds: [secondBody.data.id, firstBody.data.id, ...defaultIds] },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.map((v: { id: string }) => v.id).slice(0, 2)).toEqual([
      secondBody.data.id,
      firstBody.data.id,
    ])
  })
})
