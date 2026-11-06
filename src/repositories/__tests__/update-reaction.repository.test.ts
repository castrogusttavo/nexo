import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedMembership } from '@/src/__tests__/factories/membership.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import {
  seedProjectUpdate,
  seedUpdateReaction,
} from '@/src/__tests__/factories/update.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { UpdateReactionRepository } from '../update-reaction.repository'

afterEach(() => {
  vi.resetAllMocks()
})

async function setup() {
  const author = await seedUser()
  const ws = await seedWorkspace()
  await seedMembership({ userId: author.id, workspaceId: ws.id, role: 'OWNER' })
  const project = await seedProject(ws.id, author.id)
  const update = await seedProjectUpdate(project.id, author.id)
  return { author, update }
}

describe('UpdateReactionRepository', () => {
  describe('add()', () => {
    it('records the reaction', async () => {
      const { author, update } = await setup()

      expectOk(
        await UpdateReactionRepository.add({
          updateId: update.id,
          userId: author.id,
          emoji: '👍',
        }),
      )

      expect(await prisma.updateReaction.count()).toBe(1)
    })

    it('is idempontent: the sma person and emoji twice is one row, no error', async () => {
      const { author, update } = await setup()
      const input = { updateId: update.id, userId: author.id, emoji: '👍' }

      expectOk(await UpdateReactionRepository.add(input))
      expectOk(await UpdateReactionRepository.add(input))

      expect(await prisma.updateReaction.count()).toBe(1)
    })

    it('lets one person react with different emojis, and two people with the same', async () => {
      const { author, update } = await setup()
      const other = await seedUser()

      await UpdateReactionRepository.add({
        updateId: update.id,
        userId: author.id,
        emoji: '👍',
      })
      await UpdateReactionRepository.add({
        updateId: update.id,
        userId: author.id,
        emoji: '🎉',
      })
      await UpdateReactionRepository.add({
        updateId: update.id,
        userId: other.id,
        emoji: '👍',
      })

      expect(await prisma.updateReaction.count()).toBe(3)
    })

    it('stores a multi-codepoint emoji untouched', async () => {
      const { author, update } = await setup()

      await UpdateReactionRepository.add({
        updateId: update.id,
        userId: author.id,
        emoji: '👨‍👩‍👧',
      })

      const row = await prisma.updateReaction.findFirstOrThrow()
      expect(row.emoji).toBe('👨‍👩‍👧')
    })
  })

  describe('remove()', () => {
    it('removes only that person and that emoji', async () => {
      const { author, update } = await setup()
      const other = await seedUser()
      await seedUpdateReaction(update.id, author.id, '👍')
      await seedUpdateReaction(update.id, author.id, '🎉')
      await seedUpdateReaction(update.id, other.id, '👍')

      expectOk(
        await UpdateReactionRepository.remove({
          updateId: update.id,
          userId: author.id,
          emoji: '👍',
        }),
      )

      const left = await prisma.updateReaction.findMany({
        select: { userId: true, emoji: true },
      })
      expect(left).toHaveLength(2)
      expect(left).toContainEqual({ userId: author.id, emoji: '🎉' })
      expect(left).toContainEqual({ userId: other.id, emoji: '👍' })
    })

    it('is idempotent: removing what is not there is not an error', async () => {
      const { author, update } = await setup()

      expectOk(
        await UpdateReactionRepository.remove({
          updateId: update.id,
          userId: author.id,
          emoji: '👍',
        }),
      )
    })
  })

  it('goes away with the user, and with the update', async () => {
    const { author, update } = await setup()
    const leaving = await seedUser()
    await seedUpdateReaction(update.id, leaving.id)
    await seedUpdateReaction(update.id, author.id)

    await prisma.user.delete({ where: { id: leaving.id } })
    expect(await prisma.updateReaction.count()).toBe(1)

    await prisma.update.delete({ where: { id: update.id } })
    expect(await prisma.updateReaction.count()).toBe(0)
  })
})
