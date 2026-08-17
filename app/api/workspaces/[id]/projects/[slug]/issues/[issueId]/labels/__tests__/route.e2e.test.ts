import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedLabel } from '@/src/__tests__/factories/label.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  getJson,
  postJson,
} from '@/src/__tests__/helpers/e2e'

async function seedIssueFor(projectId: string, authorId: string) {
  const state = await seedState(projectId)
  const type = await seedIssueType(projectId)
  return seedIssue({
    stateId: state.id,
    typeId: type.id,
    authorId,
    projectId,
  })
}

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/labels', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/labels',
      {},
    )

    expect(res.status).toBe(401)
  })

  it('should attach a label from the same project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const label = await seedLabel(project.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/labels`,
      { labelId: label.id },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.labelId).toBe(label.id)
    expect(body.data.issueId).toBe(issue.id)
    expect(body.data.label.name).toBe(label.name)
  })

  it('should return 409 for a duplicate label', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const label = await seedLabel(project.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/labels`,
      { labelId: label.id },
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/labels`,
      { labelId: label.id },
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_LABEL_ALREADY_EXISTS')
  })

  it('should return 404 when the label belongs to another project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const other = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const label = await seedLabel(other.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/labels`,
      { labelId: label.id },
      user.cookie,
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('LABEL_NOT_FOUND')
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/labels', () => {
  it('should list attached labels', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const label = await seedLabel(project.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/labels`,
      { labelId: label.id },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/labels`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].label.id).toBe(label.id)
  })
})
