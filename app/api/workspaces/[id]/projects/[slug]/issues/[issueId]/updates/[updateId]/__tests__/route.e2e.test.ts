import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  addMember,
  authenticatedOwner,
  deleteJson,
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

describe('PATCH /api/workspaces/[id]/projects/[slug]/issues/[issueId]/updates/[updateId]', () => {
  it('should let the author edit and stamp editedAt', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      { status: 'ON_TRACK' },
      user.cookie,
    )
    const { data } = await created.json()
    expect(data.editedAt).toBeNull()

    const res = await patchJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates/${data.id}`,
      { status: 'AT_RISK', content: 'Piorou um pouco' },
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('AT_RISK')
    expect(body.data.editedAt).not.toBeNull()
  })

  it('should return 403 when a member edits someone else update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)
    const path = `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`

    const created = await postJson(path, { status: 'ON_TRACK' }, user.cookie)
    const { data } = await created.json()

    const member = await addMember(workspace.id, 'MEMBER')
    const added = await ProjectRepository.addMember(member.id, project.id)
    if (!added.ok) throw new Error('failed to add project member')

    const res = await patchJson(
      `${path}/${data.id}`,
      { status: 'AT_RISK' },
      { cookie: member.cookie },
    )

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_UPDATE_FORBIDDEN')
  })
})

describe('DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]/updates/[updateId]', () => {
  it('should let the author delete their own update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const created = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      { status: 'ON_TRACK' },
      user.cookie,
    )
    const { data } = await created.json()

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates/${data.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
  })

  it('should return 404 for a missing update', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await deleteJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates/nonexistent`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
