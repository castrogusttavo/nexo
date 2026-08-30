import type { Prisma } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { WikiPageDTO } from '@/types/wiki-page'
import { wikiPageForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toWikiPageDTO } from '../mappers/wiki-page.mapper'
import { WikiPageRepository } from '../repositories/wiki-page.repository'
import type {
  CreateWikiPageDTO,
  MoveWikiPageDTO,
  UpdateWikiPageDTO,
} from '../schemas/wiki-page.schema'
import { assertMember } from './_authz'

export const WikiPageService = {
  async list(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<WikiPageDTO[]>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const result = await WikiPageRepository.listByWorkspace(workspaceId)
    if (!result.ok) return result

    return ok(result.value.map(toWikiPageDTO))
  },

  async getById(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
  ): Promise<Result<WikiPageDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const result = await WikiPageRepository.findById(wikiPageId)
    if (!result.ok) return result

    if (result.value.workspaceId !== workspaceId)
      return err(wikiPageForbidden())

    return ok(toWikiPageDTO(result.value))
  },

  async create(
    actorId: string,
    workspaceId: string,
    dto: CreateWikiPageDTO,
  ): Promise<Result<WikiPageDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    if (dto.parentId) {
      const parent = await WikiPageRepository.findById(dto.parentId)
      if (!parent.ok) return parent

      if (parent.value.workspaceId !== workspaceId) {
        return err(wikiPageForbidden())
      }
    }

    const result = await WikiPageRepository.create({
      workspaceId,
      parentId: dto.parentId ?? null,
      title: dto.title,
      icon: dto.icon,
      createdById: actorId,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'wiki_page',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'wiki_page',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toWikiPageDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
    dto: UpdateWikiPageDTO,
  ): Promise<Result<WikiPageDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const existing = await WikiPageRepository.findById(wikiPageId)
    if (!existing.ok) return existing
    if (existing.value.workspaceId !== workspaceId) {
      return err(wikiPageForbidden())
    }

    const result = await WikiPageRepository.update(wikiPageId, {
      title: dto.title,
      icon: dto.icon,
      coverImage: dto.coverImage,
      content: dto.content as Prisma.InputJsonValue | undefined,
      updatedById: actorId,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'wiki_page',
        action: 'update',
        actorId,
        targetId: wikiPageId,
        outcome: 'failure',
        reason: result.error.code,
        meta: { fields: Object.keys(dto) },
      })
      return result
    }

    auditMutation({
      entity: 'wiki_page',
      action: 'update',
      actorId,
      targetId: wikiPageId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toWikiPageDTO(result.value))
  },

  async move(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
    dto: MoveWikiPageDTO,
  ): Promise<Result<WikiPageDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const existing = await WikiPageRepository.findById(wikiPageId)
    if (!existing.ok) return existing
    if (existing.value.workspaceId !== workspaceId) {
      return err(wikiPageForbidden())
    }

    if (dto.parentId) {
      if (dto.parentId === wikiPageId) {
        return err(wikiPageForbidden('Uma página não pode ser pai dela mesma'))
      }
      const parent = await WikiPageRepository.findById(dto.parentId)
      if (!parent.ok) return parent
      if (parent.value.workspaceId !== workspaceId) {
        return err(wikiPageForbidden())
      }
    }

    const result = await WikiPageRepository.move(wikiPageId, {
      parentId: dto.parentId,
      position: dto.position,
      updatedById: actorId,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'wiki_page',
        action: 'move',
        actorId,
        targetId: wikiPageId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'wiki_page',
      action: 'move',
      actorId,
      targetId: wikiPageId,
    })

    return ok(toWikiPageDTO(result.value))
  },

  async archive(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
  ): Promise<Result<WikiPageDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const existing = await WikiPageRepository.findById(wikiPageId)
    if (!existing.ok) return existing
    if (existing.value.workspaceId !== workspaceId) {
      return err(wikiPageForbidden())
    }

    const result = await WikiPageRepository.archive(wikiPageId, actorId)

    if (!result.ok) {
      auditMutation({
        entity: 'wiki_page',
        action: 'archive',
        actorId,
        targetId: wikiPageId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'wiki_page',
      action: 'archive',
      actorId,
      targetId: wikiPageId,
    })

    return ok(toWikiPageDTO(result.value))
  },
}
