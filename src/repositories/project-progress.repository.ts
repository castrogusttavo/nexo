import type { StateGroup } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'
import { dbError } from './db-error'

export interface StateGroupCount {
  group: StateGroup
  count: number
}

export const ProjectProgressRepository = {
  async countByStateGroup(
    projectId: string,
  ): Promise<Result<StateGroupCount[]>> {
    try {
      const states = await prisma.state.findMany({
        where: { projectId },
        select: {
          group: true,
          _count: { select: { issues: { where: { deletedAt: null } } } },
        },
      })

      return ok(states.map((s) => ({ group: s.group, count: s._count.issues })))
    } catch (error) {
      return err(dbError('Failed to count issues by state group', error))
    }
  },
}
