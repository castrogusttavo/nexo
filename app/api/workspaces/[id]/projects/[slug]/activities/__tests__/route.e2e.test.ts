import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedActivity } from '@/src/__tests__/factories/activity.factory'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { authenticatedOwner, getJson } from '@/src/__tests__/helpers/e2e'
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

describe('GET /api/workspaces/[id]/projects/[slug]/activities', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await getJson(
      '/api/workspaces/ws/projects/slug/activities?entityType=ISSUE&entityId=issue-1',
    )
    expect(res.status).toBe(401)
  })

  it('should return 422 for an invalid entityType', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/activities?entityType=NOT_A_TYPE&entityId=${issue.id}`,
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should list activity for an issue', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await seedActivity('ISSUE', issue.id, user.id, {
      field: 'priority',
      oldValue: 'NONE',
      newValue: 'HIGH',
    })

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/activities?entityType=ISSUE&entityId=${issue.id}`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].field).toBe('priority')
  })

  it('should return 404 when the issue belongs to another project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const other = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(other.id, user.id)

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/activities?entityType=ISSUE&entityId=${issue.id}`,
      user.cookie,
    )

    expect(res.status).toBe(404)
  })
})
