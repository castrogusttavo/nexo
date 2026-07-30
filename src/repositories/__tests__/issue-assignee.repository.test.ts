import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import {
  IssueAssigneeRepository,
  IssueSubscriberRepository,
} from '../issue-assignee.repository'

afterEach(() => {
  vi.restoreAllMocks()
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
  const assignee = await seedUser()
  return { issue, assignee }
}

describe('IssueAssigneeRepository', () => {
  describe('assign()', () => {
    it('should create the assignee', async () => {
      const { issue, assignee } = await setupIssue()

      const result = await IssueAssigneeRepository.assign(issue.id, assignee.id)

      expect(expectOk(result).userId).toBe(assignee.id)
    })

    it('should return ISSUE_ASSIGNEE_ALREADY_EXISTS for a duplicate assignment', async () => {
      const { issue, assignee } = await setupIssue()
      await IssueAssigneeRepository.assign(issue.id, assignee.id)

      const result = await IssueAssigneeRepository.assign(issue.id, assignee.id)

      expectErr(result, 'ISSUE_ASSIGNEE_ALREADY_EXISTS')
    })
  })

  describe('unassign()', () => {
    it('should remove the assignee', async () => {
      const { issue, assignee } = await setupIssue()
      await IssueAssigneeRepository.assign(issue.id, assignee.id)

      const result = await IssueAssigneeRepository.unassign(
        issue.id,
        assignee.id,
      )

      expectOk(result)
    })

    it('should return ISSUE_ASSIGNEE_NOT_FOUND when not assigned', async () => {
      const { issue, assignee } = await setupIssue()

      const result = await IssueAssigneeRepository.unassign(
        issue.id,
        assignee.id,
      )

      expectErr(result, 'ISSUE_ASSIGNEE_NOT_FOUND')
    })
  })

  describe('list()', () => {
    it('should list assignees with user data', async () => {
      const { issue, assignee } = await setupIssue()
      await IssueAssigneeRepository.assign(issue.id, assignee.id)

      const result = await IssueAssigneeRepository.list(issue.id)

      expect(expectOk(result)).toHaveLength(1)
      expect(expectOk(result)[0].user.id).toBe(assignee.id)
    })
  })
})

describe('IssueSubscriberRepository', () => {
  describe('subscribe()', () => {
    it('should create the subscription', async () => {
      const { issue, assignee } = await setupIssue()

      const result = await IssueSubscriberRepository.subscribe(
        issue.id,
        assignee.id,
      )

      expect(expectOk(result).userId).toBe(assignee.id)
    })

    it('should be idempotent for an existing subscription', async () => {
      const { issue, assignee } = await setupIssue()
      await IssueSubscriberRepository.subscribe(issue.id, assignee.id)

      const result = await IssueSubscriberRepository.subscribe(
        issue.id,
        assignee.id,
      )

      expectOk(result)
    })
  })

  describe('unsubscribe()', () => {
    it('should remove the subscription', async () => {
      const { issue, assignee } = await setupIssue()
      await IssueSubscriberRepository.subscribe(issue.id, assignee.id)

      const result = await IssueSubscriberRepository.unsubscribe(
        issue.id,
        assignee.id,
      )

      expectOk(result)
    })

    it('should return ISSUE_SUBSCRIBER_NOT_FOUND when not subscribed', async () => {
      const { issue, assignee } = await setupIssue()

      const result = await IssueSubscriberRepository.unsubscribe(
        issue.id,
        assignee.id,
      )

      expectErr(result, 'ISSUE_SUBSCRIBER_NOT_FOUND')
    })
  })

  describe('list()', () => {
    it('should list subscribers', async () => {
      const { issue, assignee } = await setupIssue()
      await IssueSubscriberRepository.subscribe(issue.id, assignee.id)

      const result = await IssueSubscriberRepository.list(issue.id)

      expect(expectOk(result)).toHaveLength(1)
    })
  })
})
