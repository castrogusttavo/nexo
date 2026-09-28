import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { UserCache } from '@/src/cache/user.cache'
import { usernameConflict } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toUserDTO } from '@/src/mappers/user.mapper'
import { UserRepository } from '@/src/repositories/user.repository'
import type { UpdateUserDTO } from '@/src/schemas/user.schema'
import type { UserDTO } from '@/types/user'

export const UserService = {
  async getProfile(actorId: string): Promise<Result<UserDTO>> {
    const cached = await UserCache.get(actorId)
    if (cached) return ok(cached)

    const result = await UserRepository.findByIdWithMemberships(actorId)
    if (!result.ok) return result

    const userDTO = toUserDTO(result.value)
    await UserCache.set(actorId, userDTO)

    return ok(userDTO)
  },

  async updateProfile(
    actorId: string,
    dto: UpdateUserDTO,
  ): Promise<Result<UserDTO>> {
    if (dto.username) {
      const existingResult = await UserRepository.findByUsername(dto.username)
      if (!existingResult.ok) return existingResult

      if (existingResult.value && existingResult.value.id !== actorId) {
        auditMutation({
          entity: 'user',
          action: 'update',
          actorId,
          targetId: actorId,
          outcome: 'failure',
          reason: 'username_conflict',
          meta: { fields: Object.keys(dto) },
        })
        return err(usernameConflict())
      }
    }

    // Written field by field rather than handing the DTO over whole: the
    // repository would persist any key it received, and the identity fields
    // (e-mail, verification state) are not this endpoint's to change. The Zod
    // schema already drops them; this is the second lock on the same door.
    const updateResult = await UserRepository.update(actorId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.username !== undefined ? { username: dto.username } : {}),
      ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
    })
    if (!updateResult.ok) {
      auditMutation({
        entity: 'user',
        action: 'update',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: updateResult.error.code,
        meta: { fields: Object.keys(dto) },
      })
      return updateResult
    }

    await UserCache.invalidate(actorId)

    const result = await UserRepository.findByIdWithMemberships(actorId)
    if (!result.ok) return result

    const userDTO = toUserDTO(result.value)
    await UserCache.set(actorId, userDTO)

    auditMutation({
      entity: 'user',
      action: 'update',
      actorId,
      targetId: actorId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(userDTO)
  },

  async acceptConsents(
    actorId: string,
    context: { ipAddress: string | null; userAgent: string | null },
  ): Promise<Result<void>> {
    const result = await UserRepository.acceptConsents(actorId, {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      at: new Date(),
    })

    if (!result.ok) {
      logger.error('consent.persist_failed', {
        actorId,
        reason: result.error.code,
      })
      auditMutation({
        entity: 'consent',
        action: 'grant',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'consent',
      action: 'grant',
      actorId,
      targetId: actorId,
      meta: {
        documents: ['TERMS', 'PRIVACY'],
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        source: 'onboarding',
      },
    })

    return ok(undefined)
  },
}
