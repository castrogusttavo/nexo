import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { IssueRelationRepository } from '../issue-relation.repository'

afterEach(() => {
  vi.resetAllMocks()
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

describe('IssueRelationRepository', () => {
  describe('create()', () => {
    it('should create the relation', async () => {
      const { source, target } = await setupIssues()

      const result = await IssueRelationRepository.create(
        source.id,
        target.id,
        'RELATES_TO',
      )

      expect(expectOk(result).targetId).toBe(target.id)
      expect(expectOk(result).type).toBe('RELATES_TO')
    })

    it('should return ISSUE_RELATION_ALREADY_EXISTS for an exact duplicate', async () => {
      const { source, target } = await setupIssues()
      await IssueRelationRepository.create(source.id, target.id, 'RELATES_TO')

      const result = await IssueRelationRepository.create(
        source.id,
        target.id,
        'RELATES_TO',
      )

      expectErr(result, 'ISSUE_RELATION_ALREADY_EXISTS')
    })

    it('should allow the same pair with a different type', async () => {
      const { source, target } = await setupIssues()
      await IssueRelationRepository.create(source.id, target.id, 'RELATES_TO')

      const result = await IssueRelationRepository.create(
        source.id,
        target.id,
        'IMPLEMENTS',
      )

      expectOk(result)
    })
  })

  describe('findBetween()', () => {
    it('should find the relation regardless of direction', async () => {
      const { source, target } = await setupIssues()
      await IssueRelationRepository.create(source.id, target.id, 'RELATES_TO')

      const forward = await IssueRelationRepository.findBetween(
        source.id,
        target.id,
        'RELATES_TO',
      )
      const reverse = await IssueRelationRepository.findBetween(
        target.id,
        source.id,
        'RELATES_TO',
      )

      expect(expectOk(forward)).not.toBeNull()
      expect(expectOk(reverse)).not.toBeNull()
    })

    it('should not match a different type', async () => {
      const { source, target } = await setupIssues()
      await IssueRelationRepository.create(source.id, target.id, 'RELATES_TO')

      const result = await IssueRelationRepository.findBetween(
        source.id,
        target.id,
        'IMPLEMENTS',
      )

      expect(expectOk(result)).toBeNull()
    })
  })

  describe('listByIssue()', () => {
    it('should list relations from both sides', async () => {
      const { source, target } = await setupIssues()
      await IssueRelationRepository.create(source.id, target.id, 'RELATES_TO')

      const fromSource = await IssueRelationRepository.listByIssue(source.id)
      const fromTarget = await IssueRelationRepository.listByIssue(source.id)

      expect(expectOk(fromSource)).toHaveLength(1)
      expect(expectOk(fromTarget)).toHaveLength(1)
    })
  })

  describe('remove()', () => {
    it('should delete the relation', async () => {
      const { source, target } = await setupIssues()

      const created = expectOk(
        await IssueRelationRepository.create(
          source.id,
          target.id,
          'RELATES_TO',
        ),
      )

      await IssueRelationRepository.remove(created.id)

      const found = await IssueRelationRepository.findById(created.id)
      expectErr(found, 'ISSUE_RELATION_NOT_FOUND')
    })

    it('should return ISSUE_RELATION_NOT_FOUND for a missing id', async () => {
      const result = await IssueRelationRepository.remove('nonexistent')
      expectErr(result, 'ISSUE_RELATION_NOT_FOUND')
    })
  })

  describe('findById()', () => {
    it('should return ISSUE_RELATION_NOT_FOUND for a missing id', async () => {
      const result = await IssueRelationRepository.findById('nonexistent')
      expectErr(result, 'ISSUE_RELATION_NOT_FOUND')
    })
  })
})
