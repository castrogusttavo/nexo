import type { UserPreference } from '@prisma/client'
import { notFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import type { UpdateUserPreferenceDTO } from '../schemas/user-preference.schema'
import { dbError } from './db-error'

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
    } catch (error) {
      return err(dbError('Failed to find user preference', error))
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
    } catch (error) {
      return err(dbError('Failed to upsert user preference', error))
    }
  },
}
