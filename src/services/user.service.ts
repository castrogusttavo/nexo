import { UserCache } from '@/src/cache/user.cache'
import { conflict } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toUserDTO } from '@/src/mappers/user.mapper'
import { UserRepository } from '@/src/repositories/user.repository'
import type { UpdateUserDTO } from '@/src/schemas/user.schema'
import type { UserDTO } from '@/types/user'

export const UserService = {
  async getProfile(actorId: string): Promise<Result<UserDTO>> {
    const cached = await UserCache.get(actorId)
    if (cached) return ok(cached)

    const result = await UserRepository.findById(actorId)
    if (!result.ok) return result

    const userDTO = toUserDTO(result.value)
    await UserCache.set(actorId, userDTO)

    return ok(userDTO)
  },

  async updateProfile(
    actorId: string,
    dto: UpdateUserDTO,
  ): Promise<Result<UserDTO>> {
    if (dto.email) {
      const existingResult = await UserRepository.findByEmail(dto.email)
      if (!existingResult.ok) return existingResult

      if (existingResult.value && existingResult.value.id !== actorId) {
        return err(conflict('E-mail já está em uso'))
      }
    }

    const result = await UserRepository.update(actorId, dto)
    if (!result.ok) return result

    const userDTO = toUserDTO(result.value)
    await UserCache.invalidate(actorId)

    return ok(userDTO)
  },
}
