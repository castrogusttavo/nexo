import type { UserPreference } from '@prisma/client'
import { databaseError, notFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import type { UpdateUserPreferenceDTO } from '../schemas/user-preference.schema'

export const UserPreferenceRepository = {
  async findByUserId(userId: string): Promise<Result<UserPreference>> {
    try {
      const preference = await prisma.userPreference.findUnique({
        where: { userId },
      })

      if (!preference) {
        return err(notFound('UserPreference'))
      }

      return ok(preference)
    } catch {
      return err(databaseError('Faield to find user preference'))
    }
  },

  async upsert(
    userId: string,
    data: UpdateUserPreferenceDTO = {},
  ): Promise<Result<UserPreference>> {
    try {
      const preference = await prisma.userPreference.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      })

      return ok(preference)
    } catch {
      return err(databaseError('Failed to upsert user preference'))
    }
  },
}
