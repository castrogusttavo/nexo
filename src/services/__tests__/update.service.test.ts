import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auditMutation } from '@/lib/axiom/audit'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeProject } from '@/src/__tests__/factories/project.factory'
import {
  createFakeUpdate,
  createFakeUpdateReply,
} from '@/src/__tests__/factories/update.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectRepository } from '@/src/repositories/project.repository'
import { UpdateRepository } from '@/src/repositories/update.repository'
import { UpdateReactionRepository } from '@/src/repositories/update-reaction.repository'
import { UpdateReplyRepository } from '@/src/repositories/update-reply.repository'
import { UpdateService } from '../update.service'
import {
  describeProjectAccessGate,
  GATE_PROJECT_ID,
} from './_project-access-gate'

vi.mock('@/src/repositories/membership.repository')
vi.mock('@/src/repositories/project.repository')
vi.mock('@/src/repositories/update.repository')
vi.mock('@/src/repositories/update-reply.repository')
vi.mock('@/src/repositories/update-reaction.repository')
vi.mock('@/lib/axiom/audit', () => ({ auditMutation: vi.fn() }))

const updates = vi.mocked(UpdateRepository)
const replies = vi.mocked(UpdateReplyRepository)
const reactions = vi.mocked(UpdateReactionRepository)
const audit = vi.mocked(auditMutation)

const ACTOR = 'actor'
const WS = 'ws1'
const SLUG = 'alpha'
type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

function arrange({
  role = 'OWNER',
  leadId = 'lead-1',
  members = [{ userId: ACTOR }],
  isPublic = false,
  updatesEnabled = true,
}: {
  role?: Role
  leadId?: string | null
  members?: { userId: string }[]
  isPublic?: boolean
  updatesEnabled?: boolean
} = {}) {
  vi.mocked(MembershipRepository.findByUserAndWorkspace).mockResolvedValue(
    ok(createFakeMembership({ userId: ACTOR, workspaceId: WS, role })),
  )
  vi.mocked(ProjectRepository.findByWorkspaceAndSlug).mockResolvedValue(
    ok({
      ...createFakeProject({
        id: GATE_PROJECT_ID,
        workspaceId: WS,
        leadId,
        isPublic,
        updatesEnabled,
      }),
      members,
      favourites: [],
    }),
  )
}

function updateRow(overrides = {}) {
  return {
    ...createFakeUpdate({
      id: 'update-1',
      projectId: GATE_PROJECT_ID,
      authorId: ACTOR,
    }),
    author: null,
    reactions: [],
    _count: { replies: 0 },
    ...overrides,
  }
}

function replyRow(overrides = {}) {
  return {
    ...createFakeUpdateReply({
      id: 'reply-1',
      updateId: 'update-1',
      authorId: ACTOR,
    }),
    author: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  arrange()
  updates.findById.mockResolvedValue(
    ok(
      createFakeUpdate({
        id: 'update-1',
        projectId: GATE_PROJECT_ID,
        authorId: ACTOR,
      }),
    ),
  )
  updates.listByProject.mockResolvedValue(ok({ updates: [], nextCursor: null }))
  updates.createForProject.mockResolvedValue(ok(updateRow()))
  updates.update.mockResolvedValue(ok(updateRow()))
  updates.delete.mockResolvedValue(ok(undefined))
  replies.findById.mockResolvedValue(
    ok(
      createFakeUpdateReply({
        id: 'reply-1',
        updateId: 'update-1',
        authorId: ACTOR,
      }),
    ),
  )
  replies.listByUpdate.mockResolvedValue(ok([]))
  replies.create.mockResolvedValue(ok(replyRow()))
  replies.update.mockResolvedValue(ok(replyRow()))
  replies.delete.mockResolvedValue(ok(undefined))
  reactions.add.mockResolvedValue(ok(undefined))
  reactions.remove.mockResolvedValue(ok(undefined))
})

describe('UpdateService.list()', () => {
  it('returns the page as DTOs, aggregating reactions for the viewer', async () => {
    updates.listByProject.mockResolvedValue(
      ok({
        updates: [
          updateRow({
            reactions: [{ emoji: '👍', userId: ACTOR }],
            _count: { replies: 2 },
          }),
        ],
        nextCursor: 'cursor-2',
      }),
    )

    const page = expectOk(
      await UpdateService.list(ACTOR, WS, SLUG, { limit: 20 }),
    )

    expect(page.nextCursor).toBe('cursor-2')
    expect(page.updates[0]).toMatchObject({
      replyCount: 2,
      reactions: [{ emoji: '👍', count: 1, reactedByMe: true }],
    })
  })

  it('asks the repository for this project, with the cursor and limit it was given', async () => {
    await UpdateService.list(ACTOR, WS, SLUG, { cursor: 'c1', limit: 5 })

    expect(updates.listByProject).toHaveBeenCalledWith(GATE_PROJECT_ID, {
      cursor: 'c1',
      limit: 5,
    })
  })

  it('answers UPDATE_DISABLED, without reading, when the project has updates off', async () => {
    arrange({ updatesEnabled: false })

    expectErr(
      await UpdateService.list(ACTOR, WS, SLUG, { limit: 20 }),
      'UPDATE_DISABLED',
    )
    expect(updates.listByProject).not.toHaveBeenCalled()
  })

  it('propagates a repository failure', async () => {
    updates.listByProject.mockResolvedValue(err(databaseError()))

    expectErr(
      await UpdateService.list(ACTOR, WS, SLUG, { limit: 20 }),
      'DATABASE_ERROR',
    )
  })
})

describe('UpdateService.create()', () => {
  it('creates the update with the actor as author, and audits it', async () => {
    expectOk(
      await UpdateService.create(ACTOR, WS, SLUG, {
        status: 'AT_RISK',
        content: 'Atrasado',
      }),
    )

    expect(updates.createForProject).toHaveBeenCalledWith({
      projectId: GATE_PROJECT_ID,
      authorId: ACTOR,
      status: 'AT_RISK',
      content: 'Atrasado',
    })
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR,
        entity: 'project',
        reason: 'post_update',
      }),
    )
  })

  it.each([
    'OWNER',
    'ADMIN',
  ] as const)('lets a workspace %s post', async (role) => {
    arrange({ role, leadId: 'someone-else' })

    expectOk(
      await UpdateService.create(ACTOR, WS, SLUG, { status: 'ON_TRACK' }),
    )
  })

  it('lets the project lead post even as a plain MEMBER of the workspace', async () => {
    arrange({ role: 'MEMBER', leadId: ACTOR })

    expectOk(
      await UpdateService.create(ACTOR, WS, SLUG, { status: 'ON_TRACK' }),
    )
  })

  it.each([
    'MEMBER',
    'VIEWER',
  ] as const)('refuses a %s who does not lead', async (role) => {
    arrange({ role, members: [{ userId: ACTOR }] })

    expectErr(
      await UpdateService.create(ACTOR, WS, SLUG, { status: 'ON_TRACK' }),
      'UPDATE_FORBIDDEN',
    )
    expect(updates.createForProject).not.toHaveBeenCalled()
  })

  it('answers UPDATE_DISABLED when the project has updates off', async () => {
    arrange({ updatesEnabled: false })

    expectErr(
      await UpdateService.create(ACTOR, WS, SLUG, { status: 'ON_TRACK' }),
      'UPDATE_DISABLED',
    )
    expect(updates.createForProject).not.toHaveBeenCalled()
  })

  it('does not audit a failed creation', async () => {
    updates.createForProject.mockResolvedValue(err(databaseError()))

    expectErr(
      await UpdateService.create(ACTOR, WS, SLUG, { status: 'ON_TRACK' }),
      'DATABASE_ERROR',
    )
    expect(audit).not.toHaveBeenCalled()
  })
})

describe('UpdateService.edit()', () => {
  const dto = { status: 'OFF_TRACK' as const, content: 'Parou' }

  it('lets the author edit', async () => {
    expectOk(await UpdateService.edit(ACTOR, WS, SLUG, 'update-1', dto))

    expect(updates.update).toHaveBeenCalledWith('update-1', dto)
  })

  it('lets an ADMIN edit what someone else wrote', async () => {
    arrange({ role: 'ADMIN' })
    updates.findById.mockResolvedValue(
      ok(
        createFakeUpdate({
          id: 'update-1',
          projectId: GATE_PROJECT_ID,
          authorId: 'other',
        }),
      ),
    )

    expectOk(await UpdateService.edit(ACTOR, WS, SLUG, 'update-1', dto))
  })

  it('refuses a plain member who is not the author', async () => {
    arrange({ role: 'MEMBER' })
    updates.findById.mockResolvedValue(
      ok(
        createFakeUpdate({
          id: 'update-1',
          projectId: GATE_PROJECT_ID,
          authorId: 'other',
        }),
      ),
    )

    expectErr(
      await UpdateService.edit(ACTOR, WS, SLUG, 'update-1', dto),
      'UPDATE_FORBIDDEN',
    )
    expect(updates.update).not.toHaveBeenCalled()
  })

  it('answers UPDATE_NOT_FOUND for an update of another project', async () => {
    updates.findById.mockResolvedValue(
      ok(createFakeUpdate({ id: 'update-1', projectId: 'other-project' })),
    )

    expectErr(
      await UpdateService.edit(ACTOR, WS, SLUG, 'update-1', dto),
      'UPDATE_NOT_FOUND',
    )
    expect(updates.update).not.toHaveBeenCalled()
  })

  it('answers UPDATE_NOT_FOUND for an update of an issue', async () => {
    updates.findById.mockResolvedValue(
      ok(
        createFakeUpdate({
          id: 'update-1',
          projectId: null,
          issueId: 'issue-1',
        }),
      ),
    )

    expectErr(
      await UpdateService.edit(ACTOR, WS, SLUG, 'update-1', dto),
      'UPDATE_NOT_FOUND',
    )
  })

  it('answers UPDATE_DISABLED when the project has updates off', async () => {
    arrange({ updatesEnabled: false })

    expectErr(
      await UpdateService.edit(ACTOR, WS, SLUG, 'update-1', dto),
      'UPDATE_DISABLED',
    )
  })
})

describe('UpdateService.delete()', () => {
  it('lets the author delete, and audits it', async () => {
    expectOk(await UpdateService.delete(ACTOR, WS, SLUG, 'update-1'))

    expect(updates.delete).toHaveBeenCalledWith('update-1')
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'delete_update',
        meta: { updateId: 'update-1' },
      }),
    )
  })

  it('lets the project lead delete what an admin wrote', async () => {
    arrange({ role: 'MEMBER', leadId: ACTOR })
    updates.findById.mockResolvedValue(
      ok(
        createFakeUpdate({
          id: 'update-1',
          projectId: GATE_PROJECT_ID,
          authorId: 'other',
        }),
      ),
    )

    expectOk(await UpdateService.delete(ACTOR, WS, SLUG, 'update-1'))
  })

  it('answers UPDATE_NOT_FOUND for an update of another project', async () => {
    updates.findById.mockResolvedValue(
      ok(createFakeUpdate({ id: 'update-1', projectId: 'other-project' })),
    )

    expectErr(
      await UpdateService.delete(ACTOR, WS, SLUG, 'update-1'),
      'UPDATE_NOT_FOUND',
    )
  })
})

describe('UpdateService replies', () => {
  describe('listReplies()', () => {
    it('returns the replies as DTOs', async () => {
      replies.listByUpdate.mockResolvedValue(ok([replyRow({ content: 'Oi' })]))

      const list = expectOk(
        await UpdateService.listReplies(ACTOR, WS, SLUG, 'update-1'),
      )

      expect(list[0]).toMatchObject({ id: 'reply-1', content: 'Oi' })
    })

    it('answers UPDATE_NOT_FOUND for an update of another project', async () => {
      updates.findById.mockResolvedValue(
        ok(createFakeUpdate({ projectId: 'other-project' })),
      )

      expectErr(
        await UpdateService.listReplies(ACTOR, WS, SLUG, 'update-1'),
        'UPDATE_NOT_FOUND',
      )
    })
  })

  describe('reply()', () => {
    it.each([
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ] as const)('lets a %s who can see the project answer', async (role) => {
      arrange({ role, isPublic: true, leadId: 'someone-else', members: [] })

      expectOk(
        await UpdateService.reply(ACTOR, WS, SLUG, 'update-1', {
          content: 'Oi',
        }),
      )
    })

    it('record the actor as the author', async () => {
      await UpdateService.reply(ACTOR, WS, SLUG, 'update-1', { content: 'Oi' })

      expect(replies.create).toHaveBeenCalledWith({
        updateId: 'update-1',
        authorId: ACTOR,
        content: 'Oi',
      })
    })

    it('answers UPDATE_DISABLED when the project has updates off', async () => {
      arrange({ updatesEnabled: false })

      expectErr(
        await UpdateService.reply(ACTOR, WS, SLUG, 'update-1', {
          content: 'Oi',
        }),
        'UPDATE_DISABLED',
      )
      expect(replies.create).not.toHaveBeenCalled()
    })

    it('answers UPDATE_NOT_FOUND for an update of another project', async () => {
      updates.findById.mockResolvedValue(
        ok(createFakeUpdate({ projectId: 'other-project' })),
      )

      expectErr(
        await UpdateService.reply(ACTOR, WS, SLUG, 'update-1', {
          content: 'Oi',
        }),
        'UPDATE_NOT_FOUND',
      )
    })
  })

  describe('editReply()', () => {
    it('lets the auhtor edit', async () => {
      expectOk(
        await UpdateService.editReply(ACTOR, WS, SLUG, 'update-1', 'reply-1', {
          content: 'Corrigido',
        }),
      )

      expect(replies.update).toHaveBeenCalledWith('reply-1', {
        content: 'Corrigido',
      })
    })

    it("does not let even an OWNER rewrite someone else's words", async () => {
      arrange({ role: 'OWNER' })
      replies.findById.mockResolvedValue(
        ok(
          createFakeUpdateReply({
            id: 'reply-1',
            updateId: 'update-1',
            authorId: 'other',
          }),
        ),
      )

      expectErr(
        await UpdateService.editReply(ACTOR, WS, SLUG, 'update-1', 'reply-1', {
          content: 'x',
        }),
        'UPDATE_FORBIDDEN',
      )
      expect(replies.update).not.toHaveBeenCalled()
    })

    it('answers UPDATE_REPLY_NOT_FOUND for a reply of another update', async () => {
      replies.findById.mockResolvedValue(
        ok(
          createFakeUpdateReply({
            id: 'reply-1',
            updateId: 'other-update',
            authorId: ACTOR,
          }),
        ),
      )

      expectErr(
        await UpdateService.editReply(ACTOR, WS, SLUG, 'update-1', 'reply-1', {
          content: 'x',
        }),
        'UPDATE_REPLY_NOT_FOUND',
      )
    })
  })

  describe('deleteReply()', () => {
    it('lets the author delete', async () => {
      expectOk(
        await UpdateService.deleteReply(ACTOR, WS, SLUG, 'update-1', 'reply-1'),
      )

      expect(replies.delete).toHaveBeenCalledWith('reply-1')
    })

    it.each([
      'OWNER',
      'ADMIN',
    ] as const)("lets a workspace %s delete anyone's reply", async (role) => {
      arrange({ role })
      replies.findById.mockResolvedValue(
        ok(
          createFakeUpdateReply({
            id: 'reply-1',
            updateId: 'update-1',
            authorId: 'other',
          }),
        ),
      )

      expectOk(
        await UpdateService.deleteReply(ACTOR, WS, SLUG, 'update-1', 'reply-1'),
      )
    })

    it("lets the porject lead delete anyone's reply", async () => {
      arrange({ role: 'MEMBER', leadId: ACTOR })
      replies.findById.mockResolvedValue(
        ok(
          createFakeUpdateReply({
            id: 'reply-1',
            updateId: 'update-1',
            authorId: 'other',
          }),
        ),
      )

      expectOk(
        await UpdateService.deleteReply(ACTOR, WS, SLUG, 'update-1', 'reply-1'),
      )
    })

    it("refuses a plain member deleting someone else's reply", async () => {
      arrange({ role: 'MEMBER' })
      replies.findById.mockResolvedValue(
        ok(
          createFakeUpdateReply({
            id: 'reply-1',
            updateId: 'update-1',
            authorId: 'other',
          }),
        ),
      )

      expectErr(
        await UpdateService.deleteReply(ACTOR, WS, SLUG, 'update-1', 'reply-1'),
        'UPDATE_FORBIDDEN',
      )
      expect(replies.delete).not.toHaveBeenCalled()
    })
  })
})

describe('UpdateService reactions', () => {
  it("records the actor's reaction", async () => {
    expectOk(await UpdateService.react(ACTOR, WS, SLUG, 'update-1', '👍'))

    expect(reactions.add).toHaveBeenCalledWith({
      updateId: 'update-1',
      userId: ACTOR,
      emoji: '👍',
    })
  })

  it("removes only actor's own reaction", async () => {
    expectOk(await UpdateService.unreact(ACTOR, WS, SLUG, 'update-1', '👍'))

    expect(reactions.remove).toHaveBeenCalledWith({
      updateId: 'update-1',
      userId: ACTOR,
      emoji: '👍',
    })
  })

  it.each([
    'react',
    'unreact',
  ] as const)('%s answers UPDATE_DISABLED when the project has updates off', async (method) => {
    arrange({ updatesEnabled: false })

    expectErr(
      await UpdateService[method](ACTOR, WS, SLUG, 'update-1', '👍'),
      'UPDATE_DISABLED',
    )
    expect(reactions.add).not.toHaveBeenCalled()
    expect(reactions.remove).not.toHaveBeenCalled()
  })

  it.each([
    'react',
    'unreact',
  ] as const)('%s answers UPDATE_NOT_FOUND for an update of another project', async (method) => {
    updates.findById.mockResolvedValue(
      ok(createFakeUpdate({ projectId: 'other-project' })),
    )

    expectErr(
      await UpdateService[method](ACTOR, WS, SLUG, 'update-1', '👍'),
      'UPDATE_NOT_FOUND',
    )
  })

  it('does not audit a reaction: it is not worth a record', async () => {
    await UpdateService.react(ACTOR, WS, SLUG, 'update-1', '👍')

    expect(audit).not.toHaveBeenCalled()
  })
})

// The same gate every project service repeats. Reading and answering open to
// anyone who can see the project; posting only to the lead and admins.
// `arrange` mocks everything past the gate so an admitted actor reaches ok().
function arrangePastGate() {
  updates.findById.mockResolvedValue(
    ok(
      createFakeUpdate({
        id: 'update-1',
        projectId: GATE_PROJECT_ID,
        authorId: ACTOR,
      }),
    ),
  )
  updates.listByProject.mockResolvedValue(ok({ updates: [], nextCursor: null }))
  updates.createForProject.mockResolvedValue(ok(updateRow()))
  updates.update.mockResolvedValue(ok(updateRow()))
  updates.delete.mockResolvedValue(ok(undefined))
  replies.listByUpdate.mockResolvedValue(ok([]))
  replies.create.mockResolvedValue(ok(replyRow()))
  reactions.add.mockResolvedValue(ok(undefined))
  reactions.remove.mockResolvedValue(ok(undefined))
}

describeProjectAccessGate('UpdateService', [
  {
    name: 'list()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.list(actorId, 'ws1', 'proj-slug', { limit: 20 }),
    sideEffects: () => [updates.listByProject],
  },
  {
    name: 'listReplies()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.listReplies(actorId, 'ws1', 'proj-slug', 'update-1'),
    sideEffects: () => [replies.listByUpdate],
  },
  {
    name: 'reply()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.reply(actorId, 'ws1', 'proj-slug', 'update-1', {
        content: 'Oi',
      }),
    sideEffects: () => [replies.create],
  },
  {
    name: 'react()',
    grants: 'member',
    publicGrants: true,
    forbiddenCode: 'PROJECT_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.react(actorId, 'ws1', 'proj-slug', 'update-1', '👍'),
    sideEffects: () => [reactions.add],
  },
  {
    name: 'create()',
    grants: 'lead',
    forbiddenCode: 'UPDATE_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.create(actorId, 'ws1', 'proj-slug', { status: 'ON_TRACK' }),
    sideEffects: () => [updates.createForProject],
  },
  {
    name: 'edit()',
    grants: 'lead',
    forbiddenCode: 'UPDATE_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.edit(actorId, 'ws1', 'proj-slug', 'update-1', {
        status: 'ON_TRACK',
      }),
    sideEffects: () => [updates.update],
  },
  {
    name: 'delete()',
    grants: 'lead',
    forbiddenCode: 'UPDATE_FORBIDDEN',
    project: { updatesEnabled: true },
    arrange: arrangePastGate,
    call: (actorId) =>
      UpdateService.delete(actorId, 'ws1', 'proj-slug', 'update-1'),
    sideEffects: () => [updates.delete],
  },
])
