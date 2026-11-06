import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  seedProjectUpdate,
  seedUpdateReply,
} from '@/src/__tests__/factories/update.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { UpdateReplyRepository } from '../update-reply.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

async function setup() {
  const author = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: author.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, author.id)
  const update = await seedProjectUpdate(project.id, author.id)
  return { author, update }
}

describe('UpdateReplyRepository', () => {
  describe('create()', () => {
    it('creates the reply with its author', async () => {
      const { author, update } = await setup()

      const reply = expectOk(
        await UpdateReplyRepository.create({
          updateId: update.id,
          authorId: author.id,
          content: 'Obrigado',
        }),
      )

      expect(reply).toMatchObject({
        updateId: update.id,
        content: 'Obrigado',
        editedAt: null,
      })
      expect(reply.author).toMatchObject({ id: author.id })
    })
  })

  describe('listByUpdate()', () => {
    it('lists the oldest first, so a thread reads top to bottom', async () => {
      const { author, update } = await setup()
      await seedUpdateReply(update.id, author.id, {
        content: 'segunda',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      })
      await seedUpdateReply(update.id, author.id, {
        content: 'primeira',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })

      const replies = expectOk(
        await UpdateReplyRepository.listByUpdate(update.id),
      )

      expect(replies.map((r) => r.content)).toEqual(['primeira', 'segunda'])
    })

    it('lists only the replies of that update', async () => {
      const { author, update } = await setup()
      const other = await seedProjectUpdate(
        update.projectId as string,
        author.id,
      )
      await seedUpdateReply(other.id, author.id, { content: 'de outro' })

      const replies = expectOk(
        await UpdateReplyRepository.listByUpdate(update.id),
      )

      expect(replies).toEqual([])
    })
  })

  describe('findById()', () => {
    it('returns the reply, or UPDATE_REPLY_NOT_FOUND', async () => {
      const { author, update } = await setup()
      const seeded = await seedUpdateReply(update.id, author.id)

      expect(expectOk(await UpdateReplyRepository.findById(seeded.id)).id).toBe(
        seeded.id,
      )
      expectErr(
        await UpdateReplyRepository.findById('nope'),
        'UPDATE_REPLY_NOT_FOUND',
      )
    })
  })

  describe('update()', () => {
    it('changes the text and stamps editedAt', async () => {
      const { author, update } = await setup()
      const seeded = await seedUpdateReply(update.id, author.id)

      const reply = expectOk(
        await UpdateReplyRepository.update(seeded.id, { content: 'Corrigido' }),
      )

      expect(reply.content).toBe('Corrigido')
      expect(reply.editedAt).not.toBeNull()
    })

    it('returns UPDATE_REPLY_NOT_FOUND for an unknown id', async () => {
      expectErr(
        await UpdateReplyRepository.update('nope', { content: 'x' }),
        'UPDATE_REPLY_NOT_FOUND',
      )
    })
  })

  describe('delete()', () => {
    it('deletes the reply and leaves the update', async () => {
      const { author, update } = await setup()
      const seeded = await seedUpdateReply(update.id, author.id)

      expectOk(await UpdateReplyRepository.delete(seeded.id))

      expect(await prisma.updateReply.count()).toBe(0)
      expect(await prisma.update.count()).toBe(1)
    })

    it('returns UPDATE_REPLY_NOT_FOUND for an unknown id', async () => {
      expectErr(
        await UpdateReplyRepository.delete('nope'),
        'UPDATE_REPLY_NOT_FOUND',
      )
    })
  })

  it('keeps the reply but forgets the author when the user goes', async () => {
    const { update } = await setup()
    const leaving = await seedUser()
    const seeded = await seedUpdateReply(update.id, leaving.id)

    await prisma.user.delete({ where: { id: leaving.id } })

    const kept = await prisma.updateReply.findUniqueOrThrow({
      where: { id: seeded.id },
    })
    expect(kept.authorId).toBeNull()
  })
})
