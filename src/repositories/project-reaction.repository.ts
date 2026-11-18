import type { ProjectReaction } from '@prisma/client'
import { err, ok, type Result } from '@/src/lib/result'
import { prisma } from '../lib/prisma'
import { dbError } from './db-error'

interface ReactionKey {
  projectId: string
  userId: string
  emoji: string
}

export const ProjectReactionRepository = {
  async listByProject(projectId: string): Promise<Result<ProjectReaction[]>> {
    try {
      return ok(await prisma.projectReaction.findMany({ where: { projectId } }))
    } catch (error) {
      return err(dbError('Failed to list project reactions', error))
    }
  },

  async add(key: ReactionKey): Promise<Result<void>> {
    try {
      await prisma.projectReaction.createMany({
        data: [key],
        skipDuplicates: true,
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to add project reaction', error))
    }
  },

  async remove(key: ReactionKey): Promise<Result<void>> {
    try {
      await prisma.projectReaction.deleteMany({ where: key })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove project reaction', error))
    }
  },
}
