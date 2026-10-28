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
import {
  describeProjectAccessGate,
  GATE_PROJECT_ID,
} from './_project-access-gate'

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

  // Moderation is a second gate after the project one: the project lead may
  // delete someone else's comment even without a privileged workspace role.
  it('should let the project lead moderate someone else comment', async () => {
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(
      ok(memberMembership),
    )
    mockedProject.findByWorkspaceAndSlug.mockResolvedValue(
      ok(projectWith({ id: 'proj-1', leadId: 'actor' }, [{ userId: 'other' }])),
    )
    mockedIssue.findById.mockResolvedValue(
      ok(createFakeIssue({ projectId: 'proj-1' })),
    )
    mockedComment.findById.mockResolvedValue(
      ok(createFakeComment({ issueId: 'issue-1', authorId: 'other' })),
    )
    mockedComment.delete.mockResolvedValue(ok(undefined))

    expectOk(
      await CommentService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
      ),
    )
    expect(mockedComment.delete).toHaveBeenCalledWith('comment-1')
  })
})

describeProjectAccessGate('CommentService', [
  {
    name: 'list()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeCommentRoundTrip,
    call: (actorId) =>
      CommentService.list(actorId, 'ws1', 'proj-slug', 'issue-1'),
    sideEffects: () => [mockedComment.listByIssue],
  },
  {
    name: 'create()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeCommentRoundTrip,
    call: (actorId) =>
      CommentService.create(actorId, 'ws1', 'proj-slug', 'issue-1', {
        content,
      }),
    sideEffects: () => [mockedComment.create],
  },
  {
    name: 'update()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeCommentRoundTrip,
    call: (actorId) =>
      CommentService.update(
        actorId,
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
        { content },
      ),
    sideEffects: () => [mockedComment.update],
  },
  {
    name: 'delete()',
    grants: 'member',
    forbiddenCode: 'ISSUE_FORBIDDEN',
    arrange: arrangeCommentRoundTrip,
    call: (actorId) =>
      CommentService.delete(
        actorId,
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
      ),
    sideEffects: () => [mockedComment.delete],
  },
])

// The actor authors the comment, so update/delete pass the ownership check
// and the project gate is the only thing that can say no.
function arrangeCommentRoundTrip() {
  mockedIssue.findById.mockResolvedValue(
    ok(createFakeIssue({ projectId: GATE_PROJECT_ID })),
  )
  mockedComment.findById.mockResolvedValue(
    ok(createFakeComment({ issueId: 'issue-1', authorId: 'actor' })),
  )
  mockedComment.listByIssue.mockResolvedValue(ok([withAuthor()]))
  mockedComment.create.mockResolvedValue(ok(withAuthor()))
  mockedComment.update.mockResolvedValue(ok(withAuthor()))
  mockedComment.delete.mockResolvedValue(ok(undefined))
}

describe('CommentService error propagation', () => {
  const boom = err(databaseError('boom'))

  function arrange() {
    arrangeCommentRoundTrip()
    inProject()
  }

  const methods = {
    list: () => CommentService.list('actor', 'ws1', 'proj-slug', 'issue-1'),
    create: () =>
      CommentService.create('actor', 'ws1', 'proj-slug', 'issue-1', {
        content,
      }),
    update: () =>
      CommentService.update(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
        { content },
      ),
    delete: () =>
      CommentService.delete(
        'actor',
        'ws1',
        'proj-slug',
        'issue-1',
        'comment-1',
      ),
  }
  const names = Object.keys(methods) as (keyof typeof methods)[]

  function expectNoCommentWork() {
    expect(mockedComment.listByIssue).not.toHaveBeenCalled()
    expect(mockedComment.findById).not.toHaveBeenCalled()
    expect(mockedComment.create).not.toHaveBeenCalled()
    expect(mockedComment.update).not.toHaveBeenCalled()
    expect(mockedComment.delete).not.toHaveBeenCalled()
  }

  it.each(
    names,
  )('%s() stops when the actor is not a workspace member', async (name) => {
    arrange()
    mockedMembership.findByUserAndWorkspace.mockResolvedValue(ok(null))

    expectErr(await methods[name](), 'FORBIDDEN')
    expect(mockedIssue.findById).not.toHaveBeenCalled()
    expectNoCommentWork()
  })

  it.each(
    names,
  )('%s() propagates a failing issue lookup and stops', async (name) => {
    arrange()
    mockedIssue.findById.mockResolvedValue(boom)

    expectErr(await methods[name](), 'DATABASE_ERROR')
    expectNoCommentWork()
  })

  it.each(
    names,
  )('%s() returns ISSUE_NOT_FOUND for an issue of another project', async (name) => {
    arrange()
    mockedIssue.findById.mockResolvedValue(
      ok(createFakeIssue({ projectId: 'other-proj' })),
    )

    expectErr(await methods[name](), 'ISSUE_NOT_FOUND')
    expectNoCommentWork()
  })

  it.each([
    ['create', () => mockedComment.create],
    ['update', () => mockedComment.update],
    ['delete', () => mockedComment.delete],
  ] as const)('%s() propagates a failing repository write', async (name, write) => {
    arrange()
    write().mockResolvedValue(boom)

    expectErr(await methods[name](), 'DATABASE_ERROR')
    expect(write()).toHaveBeenCalledTimes(1)
  })

  it.each([
    'update',
    'delete',
  ] as const)('%s() propagates a failing comment lookup and does not write', async (name) => {
    arrange()
    mockedComment.findById.mockResolvedValue(boom)

    expectErr(await methods[name](), 'DATABASE_ERROR')
    expect(mockedComment.update).not.toHaveBeenCalled()
    expect(mockedComment.delete).not.toHaveBeenCalled()
  })

  it('create() propagates a failing parent lookup and does not create', async () => {
    arrange()
    mockedComment.findById.mockResolvedValue(boom)

    const result = await CommentService.create(
      'actor',
      'ws1',
      'proj-slug',
      'issue-1',
      { content, parentId: 'parent-1' },
    )

    expectErr(result, 'DATABASE_ERROR')
    expect(mockedComment.findById).toHaveBeenCalledWith('parent-1')
    expect(mockedComment.create).not.toHaveBeenCalled()
  })

  it('delete() returns COMMENT_NOT_FOUND for a comment of another issue', async () => {
    arrange()
    mockedComment.findById.mockResolvedValue(
      ok(createFakeComment({ issueId: 'issue-2', authorId: 'actor' })),
    )

    expectErr(await methods.delete(), 'COMMENT_NOT_FOUND')
    expect(mockedComment.delete).not.toHaveBeenCalled()
  })
})
