import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssue } from '@/src/__tests__/factories/issue.factory'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedLabel } from '@/src/__tests__/factories/label.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { IssueLabelRepository } from '../issue-label.repository'

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
  const label = await seedLabel(project.id)
  return { issue, label }
}

describe('IssueLabelRepository', () => {
  describe('add()', () => {
    it('should attach the label with its data', async () => {
      const { issue, label } = await setupIssue()

      const result = await IssueLabelRepository.add(issue.id, label.id)

      expect(expectOk(result).labelId).toBe(label.id)
      expect(expectOk(result).label.name).toBe(label.name)
    })

    it('should return ISSUE_LABEL_ALREADY_EXISTS for a duplicate', async () => {
      const { issue, label } = await setupIssue()
      await IssueLabelRepository.add(issue.id, label.id)

      const result = await IssueLabelRepository.add(issue.id, label.id)

      expectErr(result, 'ISSUE_LABEL_ALREADY_EXISTS')
    })

    it('should return DATABASE_ERROR for a nonexistent label id', async () => {
      const { issue } = await setupIssue()

      const result = await IssueLabelRepository.add(issue.id, 'nonexistent')

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('remove()', () => {
    it('should detach the label', async () => {
      const { issue, label } = await setupIssue()
      await IssueLabelRepository.add(issue.id, label.id)

      const result = await IssueLabelRepository.remove(issue.id, label.id)

      expectOk(result)
    })

    it('should return ISSUE_LABEL_NOT_FOUND when not attached', async () => {
      const { issue, label } = await setupIssue()

      const result = await IssueLabelRepository.remove(issue.id, label.id)

      expectErr(result, 'ISSUE_LABEL_NOT_FOUND')
    })
  })

  describe('list()', () => {
    it('should list attached labels', async () => {
      const { issue, label } = await setupIssue()
      await IssueLabelRepository.add(issue.id, label.id)

      const result = await IssueLabelRepository.list(issue.id)

      expect(expectOk(result)).toHaveLength(1)
      expect(expectOk(result)[0].label.id).toBe(label.id)
    })
  })
})
