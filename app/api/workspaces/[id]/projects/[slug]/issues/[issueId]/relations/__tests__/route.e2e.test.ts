import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
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

async function seedIssuePair(projectId: string, authorId: string) {
  const state = await seedState(projectId)
  const type = await seedIssueType(projectId)
  const base = { stateId: state.id, typeId: type.id, authorId, projectId }
  const source = await seedIssue(base, { number: 1 })
  const target = await seedIssue(base, { number: 2 })
  return { source, target }
}

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/relations', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/relations',
      {},
    )

    expect(res.status).toBe(401)
  })

  it('should return 422 for an invalid type', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source, target } = await seedIssuePair(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: target.id, type: 'NOT_A_TYPE' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should create a relation', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source, target } = await seedIssuePair(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: target.id, type: 'RELATES_TO' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.sourceId).toBe(source.id)
    expect(body.data.targetId).toBe(target.id)
    expect(body.data.type).toBe('RELATES_TO')
  })

  it('should return 422 for a self relation', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source } = await seedIssuePair(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: source.id, type: 'RELATES_TO' },
      user.cookie,
    )

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_RELATION_SELF')
  })

  it('should return 409 when the pair is already linked in reverse', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source, target } = await seedIssuePair(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: target.id, type: 'RELATES_TO' },
      user.cookie,
    )

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${target.id}/relations`,
      { targetId: source.id, type: 'RELATES_TO' },
      user.cookie,
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('ISSUE_RELATION_ALREADY_EXISTS')
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/relations', () => {
  it('should list relations from both sides', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const { source, target } = await seedIssuePair(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      { targetId: target.id, type: 'RELATES_TO' },
      user.cookie,
    )

    const fromSource = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${source.id}/relations`,
      user.cookie,
    )

    const fromTarget = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${target.id}/relations`,
      user.cookie,
    )

    expect((await fromSource.json()).data).toHaveLength(1)
    expect((await fromTarget.json()).data).toHaveLength(1)
  })
})
