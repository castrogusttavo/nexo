import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedIssueType } from '@/src/__tests__/factories/issue-type.factory'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedState } from '@/src/__tests__/factories/state.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
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
})
