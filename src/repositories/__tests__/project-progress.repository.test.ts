import { describe, expect, it } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { ProjectProgressRepository } from '../project-progress.repository'

async function setup() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, user.id)
  const type = await seedIssueType(project.id)
  return { user, project, type }
}

describe('ProjectProgressRepository.countByStateGroup', () => {
  it('should count issues per state, skipping soft-deleted ones', async () => {
    const { user, project, type } = await setup()
    const backlog = await seedState(project.id, {
      name: 'Backlog',
      group: 'BACKLOG',
    })
    const done = await seedState(project.id, {
      name: 'Done',
      group: 'COMPLETED',
    })
    const base = { typeId: type.id, authorId: user.id, projectId: project.id }

    await seedIssue({ ...base, stateId: backlog.id }, { number: 1 })
    await seedIssue({ ...base, stateId: backlog.id }, { number: 2 })
    const deleted = await seedIssue(
      { ...base, stateId: backlog.id },
      { number: 3 },
    )
    await seedIssue({ ...base, stateId: done.id }, { number: 4 })
    await prisma.issue.update({
      where: { id: deleted.id },
      data: { deletedAt: new Date() },
    })

    const rows = expectOk(
      await ProjectProgressRepository.countByStateGroup(project.id),
    )
    const byGroup = Object.fromEntries(rows.map((r) => [r.group, r.count]))

    expect(byGroup).toEqual({ BACKLOG: 2, COMPLETED: 1 })
  })

  it('should not count issues of another project', async () => {
    const a = await setup()
    const b = await setup()
    const state = await seedState(b.project.id, { group: 'STARTED' })
    await seedIssue(
      {
        stateId: state.id,
        typeId: b.type.id,
        authorId: b.user.id,
        projectId: b.project.id,
      },
      { number: 1 },
    )

    const rows = expectOk(
      await ProjectProgressRepository.countByStateGroup(a.project.id),
    )

    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(0)
  })
})
