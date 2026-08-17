import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  getJson,
  patchJson,
} from '@/src/__tests__/helpers/e2e'
import { ProjectRepository } from '@/src/repositories/project.repository'

async function seedIssueFor(
  projectId: string,
  authorId: string,
  overrides?: { number?: number; parentId?: string },
) {
  const state = await seedState(projectId)
  const type = await seedIssueType(projectId)
  return seedIssue(
    { stateId: state.id, typeId: type.id, authorId, projectId },
    overrides,
  )
}

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/children', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/children',
    )
    expect(res.status).toBe(401)
  })

  it('should list the children of an issue', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const parent = await seedIssueFor(project.id, user.id, { number: 1 })
    const child = await seedIssueFor(project.id, user.id, {
      number: 2,
      parentId: parent.id,
    })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${parent.id}/children`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe(child.id)
  })

  it('should return an empty list for an issue without children', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/children`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

describe('PATCH .../issues/[issueId] - reparenting', () => {
  it('should return 409 when the new parent is a descendant', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const parent = await seedIssueFor(project.id, user.id, { number: 1 })
    const child = await seedIssueFor(project.id, user.id, {
      number: 2,
      parentId: parent.id,
    })

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${parent.id}`,
      { parentId: child.id },
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_PARENT_CYCLE')
  })
})
