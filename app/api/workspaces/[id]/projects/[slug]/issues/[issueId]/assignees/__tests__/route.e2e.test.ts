import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
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

async function addProjectMember(workspaceId: string, projectId: string) {
  const member = await addMember(workspaceId, 'MEMBER')
  const added = await ProjectRepository.addMember(member.id, projectId)
  if (!added.ok) throw new Error('failed to add project member')
  return member
}

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/assignees', () => {
  it('should list assignees with user data', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const member = await addProjectMember(workspace.id, project.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      { userId: member.id },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].user.id).toBe(member.id)
  })
})

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/assignees', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/assignees',
      {},
    )
    expect(res.status).toBe(401)
  })

  it('should assign a project member and auto-subscribe them', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const member = await addProjectMember(workspace.id, project.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      { userId: member.id },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.userId).toBe(member.id)
    expect(body.data.issueId).toBe(issue.id)
  })

  it('should return 404 when the target is not a project member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const outsider = await addMember(workspace.id, 'MEMBER')

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      { userId: outsider.id },
      user.cookie,
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('PROJECT_MEMBER_NOT_FOUND')
  })

  it('should return 409 for a duplicate assignment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const member = await addProjectMember(workspace.id, project.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      { userId: member.id },
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      { userId: member.id },
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_ASSIGNEE_ALREADY_EXISTS')
  })
})
