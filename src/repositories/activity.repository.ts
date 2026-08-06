import type { Activity, ActivityEntityType, Prisma, User } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type ActivityWithActor = Activity & {
  actor: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const actorSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const ActivityRepository = {
  async record(data: {
    entityType: ActivityEntityType
    entityId: string
    actorId: string
    field: string
    oldValue?: Prisma.InputJsonValue
    newValue?: Prisma.InputJsonValue
  }): Promise<Result<Activity>> {
    try {
      const activity = await prisma.activity.create({ data })
      return ok(activity)
    } catch (error) {
      return err(dbError('Failed to record activity', error))
    }
  },

  async listByEntity(
    entityType: ActivityEntityType,
    entityId: string,
  ): Promise<Result<ActivityWithActor[]>> {
    try {
      const activities = await prisma.activity.findMany({
        where: { entityType, entityId },
        include: { actor: actorSelect },
        orderBy: { createdAt: 'desc' },
      })
      return ok(activities)
    } catch (error) {
      return err(dbError('Failed to list activities', error))
    }
  },
}
