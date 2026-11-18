import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import {
  addMember,
  authenticatedOwner,
  getJson,
} from '@/src/__tests__/helpers/e2e'

const url = (ws: string, slug: string) =>
  `/api/workspaces/${ws}/projects/${slug}/progress`

describe('GET /api/workspaces/[id]/projects/[slug]/progress', () => {
  it('should return 401 when unauthenticated', async () => {
    expect((await getJson(url('ws', 's'))).status).toBe(401)
  })

  it('should return the five groups with count and percentage', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const type = await seedIssueType(project.id)
    const backlog = await seedState(project.id, {
      name: 'Backlog',
      group: 'BACKLOG',
    })
    const started = await seedState(project.id, {
      name: 'Doing',
      group: 'STARTED',
    })
    const base = { typeId: type.id, authorId: user.id, projectId: project.id }
    for (let n = 1; n <= 3; n++)
      await seedIssue({ ...base, stateId: backlog.id }, { number: n })
    for (let n = 4; n <= 7; n++)
      await seedIssue({ ...base, stateId: started.id }, { number: n })

    const res = await getJson(url(workspace.id, project.slug), user.cookie)

    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.total).toBe(7)
    expect(data.groups).toHaveLength(5)
    expect(data.groups[0]).toEqual({
      group: 'BACKLOG',
      count: 3,
      percentage: 43,
    })
  })

  it('should return 403 for a workspace member outside a private project', async () => {
    const { user, workspace } = await authenticatedOwner()
    const project = await seedProject(workspace.id, user.id)
    const stranger = await addMember(workspace.id, 'MEMBER')

    const res = await getJson(url(workspace.id, project.slug), stranger.cookie)

    expect(res.status).toBe(403)
  })
})
