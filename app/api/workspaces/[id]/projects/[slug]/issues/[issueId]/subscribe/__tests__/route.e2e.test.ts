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
  if (!result.ok) throw new Error('failed to seed project')
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

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/subscribe', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/subscribe',
      {},
    )
    expect(res.status).toBe(401)
  })

  it('should subscribe the actor', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/subscribe`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(201)
  })

  it('should be idempotent when already subscribed', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/subscribe`,
      {},
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/subscribe`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(201)
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]/subscribe', () => {
  it('should unsubscribe the actor', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/subscribe`,
      {},
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/subscribe`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should return 404 when not subscribed', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/subscribe`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
