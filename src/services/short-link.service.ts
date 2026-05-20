import { auditMutation } from '@/lib/axiom/audit'
import type {
  CreateShortLinkDTO,
  UpdateShortLinkDTO,
} from '@/src/schemas/short-link.schema'
import type { ShortLinkDTO } from '@/types/short-link'
import { forbidden } from '../errors/app-error'
import { err, ok, type Result } from '../lib/result'
import { toShortLinkDTO } from '../mappers/short-link.mapper'
import { ShortLinkRepository } from '../repositories/short-link.repository'

export const ShortLinkService = {
  async list(actorId: string): Promise<Result<ShortLinkDTO[]>> {
    const result = await ShortLinkRepository.listByUserId(actorId)

    if (!result.ok) return result

    return ok(result.value.map(toShortLinkDTO))
  },

  async getById(
    actorId: string,
    shortLinkId: string,
  ): Promise<Result<ShortLinkDTO>> {
    const result = await ShortLinkRepository.findById(shortLinkId)

    if (!result.ok) return result

    if (result.value.userId !== actorId) {
      return err(forbidden())
    }

    return ok(toShortLinkDTO(result.value))
  },

  async create(
    actorId: string,
    dto: CreateShortLinkDTO,
  ): Promise<Result<ShortLinkDTO>> {
    const result = await ShortLinkRepository.create({
      ...dto,
      userId: actorId,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'short_link',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'short_link',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toShortLinkDTO(result.value))
  },

  async update(
    actorId: string,
    shortLinkId: string,
    dto: UpdateShortLinkDTO,
  ): Promise<Result<ShortLinkDTO>> {
    const existing = await ShortLinkRepository.findById(shortLinkId)
    if (!existing.ok) return existing

    if (existing.value.userId !== actorId) {
      auditMutation({
        entity: 'short_link',
        action: 'update',
        actorId,
        targetId: shortLinkId,
        outcome: 'failure',
        reason: 'not_owner',
      })
      return err(forbidden())
    }

    const result = await ShortLinkRepository.update(shortLinkId, dto)

    if (!result.ok) {
      auditMutation({
        entity: 'short_link',
        action: 'update',
        actorId,
        targetId: shortLinkId,
        outcome: 'failure',
        reason: result.error.code,
        meta: { fields: Object.keys(dto) },
      })
      return result
    }

    auditMutation({
      entity: 'short_link',
      action: 'update',
      actorId,
      targetId: shortLinkId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toShortLinkDTO(result.value))
  },

  async delete(actorId: string, shortLinkId: string): Promise<Result<void>> {
    const existing = await ShortLinkRepository.findById(shortLinkId)
    if (!existing.ok) return existing

    if (existing.value.userId !== actorId) {
      auditMutation({
        entity: 'short_link',
        action: 'delete',
        actorId,
        targetId: shortLinkId,
        outcome: 'failure',
        reason: 'not_owner',
      })
      return err(forbidden())
    }

    const result = await ShortLinkRepository.delete(shortLinkId)

    if (!result.ok) {
      auditMutation({
        entity: 'short_link',
        action: 'delete',
        actorId,
        targetId: shortLinkId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'short_link',
      action: 'delete',
      actorId,
      targetId: shortLinkId,
    })

    return ok(undefined)
  },
}
