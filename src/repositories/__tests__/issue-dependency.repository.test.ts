import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { IssueDependencyRepository } from '@/src/repositories/issue-dependency.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setupIssues() {
  const author = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: author.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, author.id)
  const state = await seedState(project.id)
  const type = await seedIssueType(project.id)

  const base = {
    stateId: state.id,
    typeId: type.id,
    authorId: author.id,
    projectId: project.id,
  }
  const source = await seedIssue(base, { number: 1 })
  const target = await seedIssue(base, { number: 2 })

  return { source, target }
}

describe('IssueDependencyRepository', () => {
  describe('create()', () => {
    it('should create the dependency', async () => {
      const { source, target } = await setupIssues()

      const result = await IssueDependencyRepository.create(
        source.id,
        target.id,
        'BLOCKS',
      )

      expect(expectOk(result).targetId).toBe(target.id)
      expect(expectOk(result).type).toBe('BLOCKS')
    })

    it('should return ISSUE_DEPENDENCY_ALREADY_EXISTS for a duplicate', async () => {
      const { source, target } = await setupIssues()
      await IssueDependencyRepository.create(source.id, target.id, 'BLOCKS')

      const result = await IssueDependencyRepository.create(
        source.id,
        target.id,
        'BLOCKS',
      )

      expectErr(result, 'ISSUE_DEPENDENCY_ALREADY_EXISTS')
    })

    it('should allow the same pair with a different type', async () => {
      const { source, target } = await setupIssues()
      await IssueDependencyRepository.create(source.id, target.id, 'BLOCKS')

      const result = await IssueDependencyRepository.create(
        source.id,
        target.id,
        'STARTS_BEFORE',
      )

      expectOk(result)
    })
  })

  describe('listByIssue()', () => {
    it('should list dependencies in both directions', async () => {
      const { source, target } = await setupIssues()
      await IssueDependencyRepository.create(source.id, target.id, 'BLOCKS')

      const fromSource = await IssueDependencyRepository.listByIssue(source.id)
      const fromTarget = await IssueDependencyRepository.listByIssue(target.id)

      expect(expectOk(fromSource)).toHaveLength(1)
      expect(expectOk(fromTarget)).toHaveLength(1)
    })
  })

  describe('listOutgoing()', () => {
    it('should only return dependencies of the given type', async () => {
      const { source, target } = await setupIssues()
      await IssueDependencyRepository.create(source.id, target.id, 'BLOCKS')
      await IssueDependencyRepository.create(
        source.id,
        target.id,
        'STARTS_BEFORE',
      )

      const result = await IssueDependencyRepository.listOutgoing(
        source.id,
        'BLOCKS',
      )

      expect(expectOk(result)).toHaveLength(1)
      expect(expectOk(result)[0].type).toBe('BLOCKS')
    })
  })

  describe('remove()', () => {
    it('should delete the dependency', async () => {
      const { source, target } = await setupIssues()
      const created = expectOk(
        await IssueDependencyRepository.create(source.id, target.id, 'BLOCKS'),
      )

      await IssueDependencyRepository.remove(created.id)

      const found = await IssueDependencyRepository.findById(created.id)
      expectErr(found, 'ISSUE_DEPENDENCY_NOT_FOUND')
    })

    it('should return ISSUE_DEPENDENCY_NOT_FOUND for a missing id', async () => {
      const result = await IssueDependencyRepository.remove('nonexistent')
      expectErr(result, 'ISSUE_DEPENDENCY_NOT_FOUND')
    })
  })

  describe('findById()', () => {
    it('should return ISSUE_DEPENDENCY_NOT_FOUND for a missing id', async () => {
      const result = await IssueDependencyRepository.remove('nonexistent')
      expectErr(result, 'ISSUE_DEPENDENCY_NOT_FOUND')
    })
  })

  describe('findById() found', () => {
    it('should return the record when it exists', async () => {
      const { source, target } = await setupIssues()
      const created = expectOk(
        await IssueDependencyRepository.create(source.id, target.id, 'BLOCKS'),
      )

      expect(
        expectOk(await IssueDependencyRepository.findById(created.id)).id,
      ).toBe(created.id)
    })
  })

  describe('database failures', () => {
    it('findById() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.issueDependency, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IssueDependencyRepository.findById('x'), 'DATABASE_ERROR')
    })

    it('listByIssue() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.issueDependency, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IssueDependencyRepository.listByIssue('x'),
        'DATABASE_ERROR',
      )
    })

    it('listOutgoing() should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.issueDependency, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IssueDependencyRepository.listOutgoing('x', 'BLOCKS'),
        'DATABASE_ERROR',
      )
    })

    it('create() should return DATABASE_ERROR for a non-P2002 failure', async () => {
      vi.spyOn(prisma.issueDependency, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IssueDependencyRepository.create('a', 'b', 'BLOCKS'),
        'DATABASE_ERROR',
      )
    })

    it('remove() should return DATABASE_ERROR for a non-P2025 failure', async () => {
      vi.spyOn(prisma.issueDependency, 'delete').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IssueDependencyRepository.remove('x'), 'DATABASE_ERROR')
    })
  })
})
