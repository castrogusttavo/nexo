import { describe, expect, it, vi } from 'vitest'
import { createFakeComment } from '@/src/__tests__/factories/comment.factory'
import { createFakeIssue } from '@/src/__tests__/factories/issue.factory'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { CommentRepository } from '@/src/repositories/comment.repository'
import { IssueRepository } from '@/src/repositories/issue.repository'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { CommentService } from '../comment.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/issue.repository')
vi.mock('@/src/repositories/comment.repository')

const mockedMembership = vi.mocked(MembershipRepository)
const mockedProject = vi.mocked(ProjectRepository)
const mockedIssue = vi.mocked(IssueRepository)
const mockedComment = vi.mocked(CommentRepository)

const memberMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'MEMBER',
})
const ownerMembership = createFakeMembership({
  userId: 'actor',
  workspaceId: 'ws1',
  role: 'OWNER',
})

function projectWith(
  overrides?: Partial<ReturnType<typeof createFakeProject>>,
  members: { userId: string }[] = [{ userId: 'actor' }],
) {
  return {
    ...createFakeProject({ id: 'proj-1', leadId: 'lead-1', ...overrides }),
    members,
    favourites: [] as { id: string }[],
  }
}

function withAuthor(overrides?: Partial<ReturnType<typeof createFakeComment>>) {
  return {
    ...createFakeComment({ issueId: 'issue-1', ...overrides }),
    author: { id: 'actor', name: 'Ana', username: 'ana', image: null },
  }
}

function inProject(membership = memberMembership) {
  mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(membership))
  mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
    ok(projectWith({ id: 'proj-1' })),
  )
  mockedIssue.findById.mockResolvedValue(
    ok(createFakeIssue({ projectId: 'proj-1' })),
  )
}

const content = { type: 'doc', content: [] }

describe('CommentService', () => {
  describe('create()', () => {
    it('should create a root comment', async () => {
      inProject()
      mockedComment.create.mockResolvedValue(
        ok(withAuthor({ authorId: 'actor' })),
      )

      const result = await CommentService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { content },
      )

      expectOk(result)
      expect(mockedComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'actor', issueId: 'issue-1' }),
      )
    })

    it('should create a reply to a root comment', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ id: 'parent-1', issueId: 'issue-1' })),
      )
      mockedComment.create.mockResolvedValue(
        ok(withAuthor({ parentId: 'parent-1' })),
      )

      const result = await CommentService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { content, parentId: 'parent-1' },
      )

      expectOk(result)
    })

    it('should return COMMENT_NESTING_TOO_DEEP when replying to a reply', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(
          createFakeComment({
            id: 'parent-1',
            issueId: 'issue-1',
            parentId: 'parent-1',
          }),
        ),
      )

      const result = await CommentService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { content, parentId: 'reply-1' },
      )

      expectErr(result, 'COMMENT_NESTING_TOO_DEEP')
      expect(mockedComment.create).not.toHaveBeenCalled()
    })

    it('should return COMMENT_NOT_FOUND when the parent belongs to another issue', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ id: 'parent-1', issueId: 'other-issue' })),
      )

      const result = await CommentService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { content, parentId: 'parent-1' },
      )

      expectErr(result, 'COMMENT_NOT_FOUND')
      expect(mockedComment.create).not.toHaveBeenCalled()
    })

    it('should return ISSUE_FORBIDDEN when actor is not a project member', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ id: 'parent-1', issueId: 'other-issue' })),
      )
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ leadId: 'someone-else' }, [])),
      )

      const result = await CommentService.create(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        { content },
      )

      expectErr(result, 'ISSUE_FORBIDDEN')
    })
  })

  describe('update()', () => {
    it('should update the actor own comment', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'issue-1', authorId: 'actor' })),
      )
      mockedComment.update.mockResolvedValue(ok(withAuthor()))

      const result = await CommentService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
        { content },
      )

      expectOk(result)
    })

    it('should return COMMENT_FORBIDDEN when editing someone else comment', async () => {
      inProject(ownerMembership)
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'issue-1', authorId: 'other' })),
      )
      const result = await CommentService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
        { content },
      )

      expectErr(result, 'COMMENT_FORBIDDEN')
      expect(mockedComment.update).not.toHaveBeenCalled()
    })

    it('should return COMMENT_NOT_FOUND when it belongs to another issue', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'other-issue', authorId: 'actor' })),
      )
      const result = await CommentService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
        { content },
      )

      expectErr(result, 'COMMENT_NOT_FOUND')
    })
  })

  describe('delete()', () => {
    it('should delete the actor own comment', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'issue-1', authorId: 'actor' })),
      )
      mockedComment.delete.mockResolvedValue(ok(undefined))

      const result = await CommentService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
      )

      expectOk(result)
    })

    it('should let a privileged actor moderate someone else comment', async () => {
      inProject(ownerMembership)
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'issue-1', authorId: 'other' })),
      )
      mockedComment.delete.mockResolvedValue(ok(undefined))

      const result = await CommentService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
      )

      expectOk(result)
    })

    it('should return COMMENT_FORBIDDEN for a plain member deleting someone else comment', async () => {
      inProject()
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'issue-1', authorId: 'other' })),
      )

      const result = await CommentService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
      )

      expectErr(result, 'COMMENT_FORBIDDEN')
      expect(mockedComment.delete).not.toHaveBeenCalled()
    })
  })

  describe('list()', () => {
    it('should return comments as DTOs', async () => {
      inProject()
      mockedComment.listByIssue.mockResolvedValue(ok([withAuthor()]))

      const result = await CommentService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expect(expectOk(result)).toHaveLength(1)
    })

    it('should propagate repo error', async () => {
      inProject()
      mockedComment.listByIssue.mockResolvedValue(err(databaseError()))

      const result = await CommentService.list(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
      )

      expectErr(result, 'DATABASE_ERROR')
    })
  })

  // The project gate is `privileged || lead || member`. Every arm has to
  // grant on its own and the negative case has to hold with a populated
  // member list, otherwise a mutant that hardcodes any arm still passes.
  describe('project access gate', () => {
    function withProject(
      membership: typeof memberMembership,
      members: { userId: string }[],
      leadId = 'lead-1',
    ) {
      mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(membership))
      mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
        ok(projectWith({ id: 'proj-1', leadId }, members)),
      )
      mockedIssue.findById.mockResolvedValue(
        ok(createFakeIssue({ projectId: 'proj-1' })),
      )
      mockedComment.listByIssue.mockResolvedValue(ok([withAuthor()]))
    }

    it('allows the project lead who is not on the member list', async () => {
      withProject(memberMembership, [{ userId: 'someone-else' }], 'actor')

      expectOk(
        await CommentService.list('actor', 'ws1', 'proj-slug', 'issue-1'),
      )
    })

    it('allows a workspace OWNER who is neither lead nor member', async () => {
      withProject(ownerMembership, [{ userId: 'someone-else' }])

      expectOk(
        await CommentService.list('actor', 'ws1', 'proj-slug', 'issue-1'),
      )
    })

    it('allows one member among several', async () => {
      withProject(memberMembership, [
        { userId: 'other-1' },
        { userId: 'actor' },
        { userId: 'other-2' },
      ])

      expectOk(
        await CommentService.list('actor', 'ws1', 'proj-slug', 'issue-1'),
      )
    })

    it('denies an actor absent from a populated member list', async () => {
      withProject(memberMembership, [
        { userId: 'other-1' },
        { userId: 'other-2' },
      ])

      expectErr(
        await CommentService.list('actor', 'ws1', 'proj-slug', 'issue-1'),
        'ISSUE_FORBIDDEN',
      )
    })

    it('denies the same actor on update and delete, not just on list', async () => {
      withProject(memberMembership, [{ userId: 'other-1' }])
      mockedComment.findById.mockResolvedValue(
        ok(createFakeComment({ issueId: 'issue-1', authorId: 'actor' })),
      )

      expectErr(
        await CommentService.update(
          'actor',
          'ws1',
          'proj-slug',
          'issue-1',
          'comment-1',
          { content },
        ),
        'ISSUE_FORBIDDEN',
      )
      expectErr(
        await CommentService.delete(
          'actor',
          'ws1',
          'proj-slug',
          'issue-1',
          'comment-1',
        ),
        'ISSUE_FORBIDDEN',
      )
      expect(mockedComment.update).not.toHaveBeenCalled()
      expect(mockedComment.delete).not.toHaveBeenCalled()
    })
  })
})
