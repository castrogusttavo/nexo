import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { IssueUpdateRepository } from '../issue-update.repository'

afterEach(() => {
  vi.resetAllMocks()
})

async function setupIssue() {
  const author = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: author.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, author.id)
  const state = await seedState(project.id)
  const type = await seedIssueType(project.id)
  const issue = await seedIssue({
    stateId: state.id,
    typeId: type.id,
    authorId: author.id,
    projectId: project.id,
  })
  return { issue, author }
}

describe('IssueUpdateRepository', () => {
  describe('create()', () => {
    it('should create the update with author data', async () => {
      const { issue, author } = await setupIssue()

      const result = await IssueUpdateRepository.create({
        status: 'ON_TRACK',
        content: 'Tudo indo bem',
        issueId: issue.id,
        authorId: author.id,
      })

      expect(expectOk(result).status).toBe('ON_TRACK')
      expect(expectOk(result).author.id).toBe(author.id)
      expect(expectOk(result).editedAt).toBeNull()
    })

    it('should allow content to be omitted', async () => {
      const { issue, author } = await setupIssue()

      const result = await IssueUpdateRepository.create({
        status: 'AT_RISK',
        issueId: issue.id,
        authorId: author.id,
      })

      expect(expectOk(result).content).toBeNull()
    })
  })

  describe('listByIssue()', () => {
    it('should list updates newest first', async () => {
      const { issue, author } = await setupIssue()

      const first = await IssueUpdateRepository.create({
        status: 'ON_TRACK',
        issueId: issue.id,
        authorId: author.id,
      })
      const second = await IssueUpdateRepository.create({
        status: 'AT_RISK',
        issueId: issue.id,
        authorId: author.id,
      })

      const result = await IssueUpdateRepository.listByIssue(issue.id)

      expect(expectOk(result).map((u) => u.id)).toEqual([
        expectOk(second).id,
        expectOk(first).id,
      ])
    })
  })

  describe('update()', () => {
    it('should replace status/content and stamp editedAt', async () => {
      const { issue, author } = await setupIssue()
      const created = expectOk(
        await IssueUpdateRepository.create({
          status: 'ON_TRACK',
          issueId: issue.id,
          authorId: author.id,
        }),
      )

      const result = await IssueUpdateRepository.update(created.id, {
        status: 'OFF_TRACK',
        content: 'Bloqueado por dependência externa',
      })

      expect(expectOk(result).status).toBe('OFF_TRACK')
      expect(expectOk(result).editedAt).not.toBeNull()
    })

    it('should return ISSUE_UPDATE_NOT_FOUND for a missing id', async () => {
      const result = await IssueUpdateRepository.update('nonexistent', {
        status: 'ON_TRACK',
      })
      expectErr(result, 'ISSUE_UPDATE_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should remove the update', async () => {
      const { issue, author } = await setupIssue()

      const created = expectOk(
        await IssueUpdateRepository.create({
          status: 'ON_TRACK',
          issueId: issue.id,
          authorId: author.id,
        }),
      )

      await IssueUpdateRepository.delete(created.id)

      const found = await IssueUpdateRepository.findById(created.id)
      expectErr(found, 'ISSUE_UPDATE_NOT_FOUND')
    })

    it('should return ISSUE_UPDATE_NOT_FOUND for a missing id', async () => {
      const found = await IssueUpdateRepository.delete('nonexistent')
      expectErr(found, 'ISSUE_UPDATE_NOT_FOUND')
    })
  })

  describe('findById()', () => {
    it('should return ISSUE_UPDATE_NOT_FOUND for a missing id', async () => {
      const found = await IssueUpdateRepository.findById('nonexistent')
      expectErr(found, 'ISSUE_UPDATE_NOT_FOUND')
    })
  })
})
