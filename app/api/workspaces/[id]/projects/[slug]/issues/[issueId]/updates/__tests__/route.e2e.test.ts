import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
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

describe('POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/updates', () => {
  it('should return 401 when unauthenticated', async () => {
    const res = await postJson(
      '/api/workspaces/ws/projects/slug/issues/issue-1/updates',
      {},
    )
    expect(res.status).toBe(401)
  })

  it('should return 422 for an invalid status', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      { status: 'NOT_A_STATUS' },
      user.cookie,
    )

    expect(res.status).toBe(422)
  })

  it('should create an update without content', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const res = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      { status: 'ON_TRACK' },
      user.cookie,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.status).toBe('ON_TRACK')
    expect(body.data.content).toBeNull()
    expect(body.data.author.id).toBe(user.id)
  })
})

describe('GET /api/workspaces/[id]/projects/[slug]/issues/[issueId]/updates', () => {
  it('should list updates newest first', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const issue = await seedIssueFor(project.id, user.id)

    const first = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      { status: 'ON_TRACK' },
      user.cookie,
    )
    const firstBody = await first.json()

    const second = await postJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      { status: 'ON_TRACK' },
      user.cookie,
    )
    const secondBody = await second.json()

    const res = await getJson(
      `/api/workspaces/${workspace.id}/projects/${project.slug}/issues/${issue.id}/updates`,
      user.cookie,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.map((u: { id: string }) => u.id)).toEqual([
      secondBody.data.id,
      firstBody.data.id,
    ])
  })
})
