import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { ProjectReactionRepository } from '@/src/repositories/project-reaction.repository'
import { ProjectReactionService } from '../project-reaction.service'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/project-reaction.repository')

const membership = vi.mocked(MembershipRepository)
const projects = vi.mocked(ProjectRepository)
const reactions = vi.mocked(ProjectReactionRepository)

function asRole(role: 'MEMBER' | 'VIEWER') {
  membership.findByUserAndWorkspace.mockResolvedValue(
    ok(createFakeMembership({ userId: 'actor', workspaceId: 'ws1', role })),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  asRole('MEMBER')
  projects.findByWorkspaceAndSlug.mockResolvedValue(
    ok({
      id: 'p1',
      workspaceId: 'ws1',
      leadId: 'lead',
      isPublic: true,
      members: [],
      favourites: [],
      labelAssignments: [],
    } as never),
  )
})

describe('ProjectReactionService', () => {
  it('should summarize the reactions for the viewer', async () => {
    reactions.listByProject.mockResolvedValue(
      ok([
        {
          projectId: 'p1',
          userId: 'actor',
          emoji: '👍',
          createdAt: new Date(),
        },
        { projectId: 'p1', userId: 'b', emoji: '👍', createdAt: new Date() },
      ]),
    )

    const result = await ProjectReactionService.list('actor', 'ws1', 'slug')

    expect(expectOk(result)).toEqual([
      { emoji: '👍', count: 2, reactedByMe: true },
    ])
  })

  it('should add a reaction for a member', async () => {
    reactions.add.mockResolvedValue(ok(undefined))

    expectOk(await ProjectReactionService.react('actor', 'ws1', 'slug', '👍'))

    expect(reactions.add).toHaveBeenCalledWith({
      projectId: 'p1',
      userId: 'actor',
      emoji: '👍',
    })
  })

  it('should refuse a VIEWER and never write', async () => {
    asRole('VIEWER')

    const result = await ProjectReactionService.react(
      'actor',
      'ws1',
      'slug',
      '👍',
    )

    expect(expectErr(result).code).toBe('PROJECT_FORBIDDEN')
    expect(reactions.add).not.toHaveBeenCalled()
  })

  it('should remove a reaction', async () => {
    reactions.remove.mockResolvedValue(ok(undefined))

    expectOk(await ProjectReactionService.unreact('actor', 'ws1', 'slug', '👍'))

    expect(reactions.remove).toHaveBeenCalledWith({
      projectId: 'p1',
      userId: 'actor',
      emoji: '👍',
    })
  })
})
