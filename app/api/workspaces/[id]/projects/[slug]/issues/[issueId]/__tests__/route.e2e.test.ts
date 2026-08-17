import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  deleteJson,
  patchJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

describe('PATCH /api/workspaces/[id]/projects/[slug]/issues/[issueId]', () => {
  it('should allow a project member to rename an issue', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: state.id,
        priority: 'NONE',
      },
      user.cookie,
    )
    const { data } = await created.json()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${data.id}`,
      { title: 'Fixed bug' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.title).toBe('Fixed bug')
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]', () => {
  it('should soft-delete the issue', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const state = await seedState(project.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues`,
      {
        title: 'Bug',
        description: { type: 'doc', content: [] },
        stateId: state.id,
        priority: 'NONE',
      },
      user.cookie,
    )
    const { data } = await created.json()

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${data.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })
})
