import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  addMember,
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

async function addProjectMember(workspaceId: string, projectId: string) {
  const member = await addMember(workspaceId, 'MEMBER')
  const added = await ProjectRepository.addMember(member.id, projectId)
  if (!added.ok) throw new Error('failed to add project member')
  return member
}

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]/assignees/[userId]', () => {
  it('should unassign the member', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const member = await addProjectMember(workspace.id, project.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees`,
      { userId: member.id },
      user.cookie,
    )

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees/${member.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should return 404 when the member is not assigned', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const member = await addProjectMember(workspace.id, project.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/assignees/${member.id}`,
      user.cookie,
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_ASSIGNEE_NOT_FOUND')
  })
})
