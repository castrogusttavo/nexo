import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { getPrismaReplica } from '@/src/lib/prisma-replica'
import { IssueRepository } from '../issue.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupProject() {
  const user = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: user.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, user.id)
  const state = await seedState(project.id)
  const type = await seedIssueType(project.id)
  return { user, project, state, type }
}

function issueInput(overrides: {
  stateId: string
  typeId: string
  authorId: string
  projectId: string
}) {
  return {
    title: 'Bug',
    description: { type: 'doc', content: [] },
    ...overrides,
  }
}

describe('IssueRepository', () => {
  describe('findById()', () => {
    it('should return the issue', async () => {
      const { user, project, state, type } = await setupProject()
      const created = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )

      const result = await IssueRepository.findById(created.id)

      expect(expectOk(result).id).toBe(created.id)
    })

    it('should return ISSUE_NOT_FOUND for a soft-deleted issue', async () => {
      const { user, project, state, type } = await setupProject()
      const created = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )
      await IssueRepository.delete(created.id)

      const result = await IssueRepository.findById(created.id)
      expectErr(result, 'ISSUE_NOT_FOUND')
    })

    it('should return ISSUE_NOT_FOUND for a missing id', async () => {
      const result = await IssueRepository.findById('nonexistent')

      expectErr(result, 'ISSUE_NOT_FOUND')
    })
  })

  describe('listByProject()', () => {
    it('should list issues ordered by number, excluding soft-deleted', async () => {
      const { user, project, state, type } = await setupProject()
      const first = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )
      const second = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )
      await IssueRepository.delete(second.id)

      const result = await IssueRepository.listByProject(project.id)

      expect(expectOk(result).map((i) => i.id)).toEqual([first.id])
    })
  })

  describe('listChildren()', () => {
    it('should list children ordered by number, excluding soft-deleted', async () => {
      const { user, project, state, type } = await setupProject()
      const parent = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )
      const child = expectOk(
        await IssueRepository.create({
          ...issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
          parentId: parent.id,
        }),
      )
      const removed = expectOk(
        await IssueRepository.create({
          ...issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
          parentId: parent.id,
        }),
      )

      await IssueRepository.delete(removed.id)

      const result = await IssueRepository.listChildren(parent.id)

      expect(expectOk(result).map((i) => i.id)).toEqual([child.id])
    })
  })

  describe('create()', () => {
    it('should assign sequential numbers scoped to the project', async () => {
      const { user, project, state, type } = await setupProject()

      const first = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )
      const second = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )

      expect(first.number).toBe(1)
      expect(second.number).toBe(2)
    })

    it('should return DATABASE_ERROR for a nonexistent project id', async () => {
      const result = await IssueRepository.create(
        issueInput({
          stateId: 'nonexistent',
          typeId: 'nonexistent',
          authorId: 'nonexistent',
          projectId: 'nonexistent',
        }),
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('update()', () => {
    it('should update issue fields', async () => {
      const { user, project, state, type } = await setupProject()

      const created = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )

      const result = await IssueRepository.update(created.id, {
        title: 'Renamed',
      })

      expect(expectOk(result).title).toBe('Renamed')
    })

    it('should return ISSUE_NOT_FOUND for a missing id', async () => {
      const result = await IssueRepository.update('nonexistent', {
        title: 'Renamed',
      })

      expectErr(result, 'ISSUE_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should soft-delete by setting deletedAt', async () => {
      const { user, project, state, type } = await setupProject()
      const created = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )

      await IssueRepository.delete(created.id)

      const found = await IssueRepository.findById(created.id)
      expectErr(found, 'ISSUE_NOT_FOUND')
    })

    it('should return ISSUE_NOT_FOUND for a missing id', async () => {
      const result = await IssueRepository.delete('nonexistent')

      expectErr(result, 'ISSUE_NOT_FOUND')
    })
  })

  describe('findByProjectAndNumber()', () => {
    it('should return the issue with that number in the project', async () => {
      const { user, project, state, type } = await setupProject()
      const created = expectOk(
        await IssueRepository.create(
          issueInput({
            stateId: state.id,
            typeId: type.id,
            authorId: user.id,
            projectId: project.id,
          }),
        ),
      )

      const result = await IssueRepository.findByProjectAndNumber(
        project.id,
        created.number,
      )

      expect(expectOk(result).id).toBe(created.id)
    })

    it('should return ISSUE_NOT_FOUND for an unknown number', async () => {
      const { project } = await setupProject()

      const result = await IssueRepository.findByProjectAndNumber(
        project.id,
        999,
      )

      expectErr(result, 'ISSUE_NOT_FOUND')
    })
  })

  describe('listByProjectPage()', () => {
    it('should page by number and report whether a next page exists', async () => {
      const { user, project, state, type } = await setupProject()
      const created = []
      for (let i = 0; i < 3; i++) {
        created.push(
          expectOk(
            await IssueRepository.create(
              issueInput({
                stateId: state.id,
                typeId: type.id,
                authorId: user.id,
                projectId: project.id,
              }),
            ),
          ),
        )
      }

      const first = expectOk(
        await IssueRepository.listByProjectPage(project.id, { take: 2 }),
      )
      expect(first.items.map((i) => i.id)).toEqual([
        created[0].id,
        created[1].id,
      ])
      expect(first.hasNextPage).toBe(true)

      const second = expectOk(
        await IssueRepository.listByProjectPage(project.id, {
          cursor: created[1].number,
          take: 2,
        }),
      )
      expect(second.items.map((i) => i.id)).toEqual([created[2].id])
      expect(second.hasNextPage).toBe(false)
    })
  })

  describe('countByProject()', () => {
    it('should count the live issues of the project', async () => {
      const { user, project, state, type } = await setupProject()
      const input = issueInput({
        stateId: state.id,
        typeId: type.id,
        authorId: user.id,
        projectId: project.id,
      })
      expectOk(await IssueRepository.create(input))
      const removed = expectOk(await IssueRepository.create(input))
      await IssueRepository.delete(removed.id)

      expect(expectOk(await IssueRepository.countByProject(project.id))).toBe(1)
    })
  })

  describe('database failures', () => {
    it('findById() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IssueRepository.findById('x'), 'DATABASE_ERROR')
    })

    it('listByProject() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(getPrismaReplica().issue, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IssueRepository.listByProject('x'), 'DATABASE_ERROR')
    })

    it('listChildren() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.issue, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IssueRepository.listChildren('x'), 'DATABASE_ERROR')
    })

    it('findByProjectAndNumber() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.issue, 'findFirst').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IssueRepository.findByProjectAndNumber('x', 1),
        'DATABASE_ERROR',
      )
    })

    it('listByProjectPage() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(getPrismaReplica().issue, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IssueRepository.listByProjectPage('x', { take: 10 }),
        'DATABASE_ERROR',
      )
    })

    it('countByProject() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(getPrismaReplica().issue, 'count').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IssueRepository.countByProject('x'), 'DATABASE_ERROR')
    })

    it('update() should return DATABASE_ERROR for a non-P2025 failure', async () => {
      vi.spyOn(prisma.issue, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(
        await IssueRepository.update('x', { title: 'T' }),
        'DATABASE_ERROR',
      )
    })

    it('delete() should return DATABASE_ERROR for a non-P2025 failure', async () => {
      vi.spyOn(prisma.issue, 'update').mockRejectedValueOnce(new Error('boom'))
      expectErr(await IssueRepository.delete('x'), 'DATABASE_ERROR')
    })
  })
})
