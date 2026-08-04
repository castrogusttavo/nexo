import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  authenticatedOwner,
  deleteJson,
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
  if (!result.ok) throw new Error('failed to eed project')
  return result.value
}

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

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/votes', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/worksaces/ws/projects/slug/issues/issue-1/votes',
      {},
    )

    expect(res.status).toBe(401)
  })

  it('should return 422 for an invalid type', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      { type: 'MAYBE' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should switch the vote instead of adding a second one', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      { type: 'UP' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ up: 1, down: 0, myVote: 'UP' })
  })

  it('should switch the vote instead of adding a second one', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      { type: 'UP' },
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      { type: 'DOWN' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ up: 0, down: 1, myVote: 'DOWN' })
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]/votes', () => {
  it('should retract the vote', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      { type: 'UP' },
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ up: 0, down: 0, myVote: null })
  })

  it('should return 404 when there is no vote to retract', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/votes', () => {
  it('should return zeros for an issue without votes', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      { type: 'UP' },
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/votes`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ up: 0, down: 0, myVote: null })
  })
})
