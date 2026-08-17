import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  deleteJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

async function seedIssuePair(projectId: string, authorId: string) {
  const state = await seedState(projectId)
  const type = await seedIssueType(projectId)
  const base = { stateId: state.id, typeId: type.id, authorId, projectId }
  const source = await seedIssue(base, { number: 1 })
  const target = await seedIssue(base, { number: 2 })
  return { source, target }
}

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]/relations/[relationId]', () => {
  it('should remove the relation from the source side', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source, target } = await seedIssuePair(project.id, user.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: target.id, type: 'RELATES_TO' },
      user.cookie,
    )

    const { data } = await created.json()

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations/${data.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should remove the relation from the target side', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source, target } = await seedIssuePair(project.id, user.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: target.id, type: 'RELATES_TO' },
      user.cookie,
    )

    const { data } = await created.json()

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${target.id}/relations/${data.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should return 404 for a missing relation', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source } = await seedIssuePair(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations/nonexistent`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
