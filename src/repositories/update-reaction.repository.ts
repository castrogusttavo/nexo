import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

interface ReactionKey {
  updateId: string
  userId: string
  emoji: string
}

// Both calls are idempotent: a double click, or a retry, is not an error.
export const UpdateReactionRepository = {
  async add(key: ReactionKey): Promise<Result<void>> {
    try {
      await prisma.updateReaction.createMany({
        data: [key],
        skipDuplicates: true,
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to add update reaction', error))
    }
  },

  async remove(key: ReactionKey): Promise<Result<void>> {
    try {
      await prisma.updateReaction.deleteMany({ where: key })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove update reaction', error))
    }
  },
}
