import { describe, expect, it } from 'vitest'
import { seedProjectLabel } from '@/src/__tests__/factories/project-label.factory'
import {
  addMember,
  authenticatedOwner,
  createAuthenticatedUser,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

describe('GET /api/workspaces/[id]/project-labels', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await getJson('/api/workspaces/ws/project-labels')
    expect(res.status).toBe(401)
  })

  it('should start empty and list the labels alphabetically to any member', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const empty = await getJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      member.cookie,
    )
    expect(empty.status).toBe(200)
    expect((await empty.json()).data).toEqual([])

    await seedProjectLabel(workspace.id, { name: 'Vendas' })
    await seedProjectLabel(workspace.id, { name: 'Marketing' })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      member.cookie,
    )
    expect(
      (await res.json()).data.map((l: { name: string }) => l.name),
    ).toEqual(['Marketing', 'Vendas'])
  })

  it('should return 403 to someone outside the workspace', async () => {
    const { workspace } = await authenticatedOwner()
    const outsider = await createAuthenticatedUser()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      outsider.cookie,
    )

    expect(res.status).toBe(403)
  })
})

describe('POST /api/workspaces/[id]/project-labels', () => {
  it('should return 401 via middleware when unauthenticated', async () => {
    const res = await postJson('/api/workspaces/ws/project-labels', {})
    expect(res.status).toBe(401)
  })

  it('should return 422 for an invalid body', async () => {
    const { user, workspace } = await authenticatedOwner()

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      { name: '' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should let an ADMIN create a label, ZINC by default', async () => {
    const { workspace } = await authenticatedOwner()
    const admin = await addMember(workspace.id, 'ADMIN')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      { name: 'Marketing' },
      admin.cookie,
    )

    expect(res.status).toBe(201)
    expect((await res.json()).data).toMatchObject({
      name: 'Marketing',
      color: 'ZINC',
      workspaceId: workspace.id,
    })
  })

  it('should return 403 PROJECT_LABEL_FORBIDDEN to a MEMBER', async () => {
    const { workspace } = await authenticatedOwner()
    const member = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      { name: 'Marketing' },
      member.cookie,
    )

    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('PROJECT_LABEL_FORBIDDEN')
  })

  it('should return 409 PROJECT_LABEL_ALREADY_EXISTS for a taken name', async () => {
    const { user, workspace } = await authenticatedOwner()
    await seedProjectLabel(workspace.id, { name: 'Marketing' })

    const res = await postJson(
      `/api/workspaces/${workspace.id}/project-labels`,
      { name: 'Marketing' },
      user.cookie,
    )

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('PROJECT_LABEL_ALREADY_EXISTS')
  })
})
