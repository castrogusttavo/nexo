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

const content = { type: 'doc', content: [] }

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/comments', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/comments',
      {},
    )

    expect(res.status).toBe(401)
  })

  it('should return 422 when content is missing', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      {},
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should create a root comment', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      { content },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.issueId).toBe(issue.id)
    expect(body.data.issueId).toBeNull()
    expect(body.data.author.id).toBe(user.id)
  })

  it('should create a reply and reject replying to a reply', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const root = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      { content },
      user.cookie,
    )
    const rootBody = await root.json()

    const reply = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      { content, parentId: rootBody.data.id },
      user.cookie,
    )

    expect(reply.status).toBe(201)
    const replyBody = await reply.json()
    expect(replyBody.data.parentId).toBe(rootBody.data.id)

    const nested = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      { content, parentId: replyBody.data.id },
      user.cookie,
    )

    expect(reply.status).toBe(201)
    const nestedBody = await nested.json()
    expect(nestedBody.error.code).toBe('COMMENT_NESTING_TOO_DEEP')
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/comments', () => {
  it('should list comments with their authors', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      { content },
      user.cookie,
    )

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/comments`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].author.id).toBe(user.id)
  })
})
