import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { IssueVoteRepository } from '../issue-vote.repository'

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

describe('IssueVoteRepository', () => {
  describe('upsert()', () => {
    it('should create the vote', async () => {
      const { issue, author } = await setupIssue()

      const result = await IssueVoteRepository.upsert(issue.id, author.id, 'UP')

      expect(expectOk(result).type).toBe('UP')
    })

    it('should switch the vote instead of creating a second row', async () => {
      const { issue, author } = await setupIssue()
      await IssueVoteRepository.upsert(issue.id, author.id, 'UP')

      const result = await IssueVoteRepository.upsert(
        issue.id,
        author.id,
        'DOWN',
      )

      expect(expectOk(result).type).toBe('DOWN')

      const tally = await IssueVoteRepository.tallyByIssue(issue.id)
      expect(expectOk(tally)).toEqual({ up: 0, down: 1 })
    })
  })

  describe('tallyByIssue()', () => {
    it('should count each direction separately', async () => {
      const { issue, author } = await setupIssue()
      const other = await seedUser()
      await IssueVoteRepository.upsert(issue.id, author.id, 'UP')
      await IssueVoteRepository.upsert(issue.id, other.id, 'DOWN')

      const result = await IssueVoteRepository.tallyByIssue(issue.id)

      expect(expectOk(result)).toEqual({ up: 1, down: 1 })
    })

    it('should return zeros for an issue without votes', async () => {
      const { issue } = await setupIssue()

      const result = await IssueVoteRepository.tallyByIssue(issue.id)

      expect(expectOk(result)).toEqual({ up: 0, down: 0 })
    })
  })

  describe('findByIssueAndUser()', () => {
    it('should return null when the user has not voted', async () => {
      const { issue, author } = await setupIssue()

      const result = await IssueVoteRepository.findByIssueAndUser(
        issue.id,
        author.id,
      )

      expect(expectOk(result)).toBeNull()
    })

    it('should return the vote when it exists', async () => {
      const { issue, author } = await setupIssue()
      await IssueVoteRepository.upsert(issue.id, author.id, 'UP')

      const result = await IssueVoteRepository.findByIssueAndUser(
        issue.id,
        author.id,
      )

      expect(expectOk(result)?.type).toBe('UP')
    })
  })

  describe('delete()', () => {
    it('should remove the vote', async () => {
      const { issue, author } = await setupIssue()
      await IssueVoteRepository.upsert(issue.id, author.id, 'UP')

      const result = await IssueVoteRepository.delete(issue.id, author.id)

      expectOk(result)

      const found = await IssueVoteRepository.findByIssueAndUser(
        issue.id,
        author.id,
      )

      expect(expectOk(found)).toBeNull()
    })

    it('should return ISSUE_VOTE_NOT_FOUND when there is no vote', async () => {
      const { issue, author } = await setupIssue()

      const result = await IssueVoteRepository.delete(issue.id, author.id)

      expectErr(result, 'ISSUE_VOTE_NOT_FOUND')
    })
  })
})
