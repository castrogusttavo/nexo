import type { Prisma } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import { err, ok, type Result } from '@/src/lib/result'
import { toStickyNoteDTO } from '@/src/mappers/sticky-note.mapper'
import { StickyNoteRepository } from '@/src/repositories/sticky-note.repository'
import type {
  CreateStickyNoteDTO,
  UpdateStickyNoteDTO,
} from '@/src/schemas/sticky-note.schema'
import type { StickyNoteDTO } from '@/types/sticky-note'
import { forbidden } from '../errors/app-error'

export const StickyNoteService = {
  async list(actorId: string): Promise<Result<StickyNoteDTO[]>> {
    const result = await StickyNoteRepository.listByUserId(actorId)

    if (!result.ok) return result

    return ok(result.value.map(toStickyNoteDTO))
  },

  async getById(
    actorId: string,
    stickyNoteId: string,
  ): Promise<Result<StickyNoteDTO>> {
    const result = await StickyNoteRepository.findById(stickyNoteId)

    if (!result.ok) return result

    if (result.value.userId !== actorId) return err(forbidden())

    return ok(toStickyNoteDTO(result.value))
  },

  async create(
    actorId: string,
    dto: CreateStickyNoteDTO,
  ): Promise<Result<StickyNoteDTO>> {
    const result = await StickyNoteRepository.create({
      userId: actorId,
      content: dto.content as Prisma.InputJsonValue | undefined,
      color: dto.color,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'sticky_note',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'sticky_note',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toStickyNoteDTO(result.value))
  },

  async update(
    actorId: string,
    stickyNoteId: string,
    dto: UpdateStickyNoteDTO,
  ): Promise<Result<StickyNoteDTO>> {
    const existing = await StickyNoteRepository.findById(stickyNoteId)
    if (!existing.ok) return existing

    if (existing.value.userId !== actorId) {
      auditMutation({
        entity: 'sticky_note',
        action: 'update',
        actorId,
        targetId: stickyNoteId,
        outcome: 'failure',
        reason: 'not_owner',
      })
      return err(forbidden())
    }

    const result = await StickyNoteRepository.update(stickyNoteId, {
      content: dto.content as Prisma.InputJsonValue | undefined,
      color: dto.color,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'sticky_note',
        action: 'update',
        actorId,
        targetId: stickyNoteId,
        outcome: 'failure',
        reason: result.error.code,
        meta: { fields: Object.keys(dto) },
      })
      return result
    }

    auditMutation({
      entity: 'sticky_note',
      action: 'update',
      actorId,
      targetId: stickyNoteId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toStickyNoteDTO(result.value))
  },

  async delete(actorId: string, stickyNoteId: string): Promise<Result<void>> {
    const existing = await StickyNoteRepository.findById(stickyNoteId)
    if (!existing.ok) return existing

    if (existing.value.userId !== actorId) {
      auditMutation({
        entity: 'sticky_note',
        action: 'delete',
        actorId,
        targetId: stickyNoteId,
        outcome: 'failure',
        reason: 'not_owner',
      })
      return err(forbidden())
    }

    const result = await StickyNoteRepository.delete(stickyNoteId)

    if (!result.ok) {
      auditMutation({
        entity: 'sticky_note',
        action: 'delete',
        actorId,
        targetId: stickyNoteId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'sticky_note',
      action: 'delete',
      actorId,
      targetId: stickyNoteId,
    })

    return ok(undefined)
  },
}
