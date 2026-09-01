import type { Prisma } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { WikiCommentDTO } from '@/types/wiki-comment'
import {
  wikiCommentForbidden,
  wikiCommentNestingTooDeep,
  wikiCommentNotFound,
  wikiPageForbidden,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toWikiCommentDTO } from '../mappers/wiki-comment.mapper'
import { WikiCommentRepository } from '../repositories/wiki-comment.repository'
import { WikiPageRepository } from '../repositories/wiki-page.repository'
import type {
  CreateWikiCommentDTO,
  ResolveWikiCommentDTO,
  UpdateWikiCommentDTO,
} from '../schemas/wiki-comment.schema'
import { assertMember } from './_authz'

async function assertWikiPageInWorkspace(
  wikiPageId: string,
  workspaceId: string,
): Promise<Result<void>> {
  const page = await WikiPageRepository.findById(wikiPageId)
  if (!page.ok) return page
  if (page.value.workspaceId !== workspaceId) return err(wikiPageForbidden())
  return ok(undefined)
}

export const WikiCommentService = {
  async list(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
  ): Promise<Result<WikiCommentDTO[]>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const pageCheck = await assertWikiPageInWorkspace(wikiPageId, workspaceId)
    if (!pageCheck.ok) return pageCheck

    const result = await WikiCommentRepository.listByWikiPage(wikiPageId)
    if (!result.ok) return result

    return ok(result.value.map(toWikiCommentDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
    dto: CreateWikiCommentDTO,
  ): Promise<Result<WikiCommentDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const pageCheck = await assertWikiPageInWorkspace(wikiPageId, workspaceId)
    if (!pageCheck.ok) return pageCheck

    let markId = dto.markId

    if (dto.parentId) {
      const parent = await WikiCommentRepository.findById(dto.parentId)
      if (!parent.ok) return parent
      if (parent.value.wikiPageId !== wikiPageId) {
        return err(wikiCommentNotFound())
      }
      if (parent.value.parentId) return err(wikiCommentNestingTooDeep())

      // A reply always joins its parent's discussion — the client-supplied
      // markId is ignored in this case rather than trusted, so a reply can
      // never end up pointing at a different mark than its thread.
      markId = parent.value.markId
    }

    const result = await WikiCommentRepository.create({
      wikiPageId,
      authorId: actorId,
      markId,
      content: dto.content as Prisma.InputJsonValue,
      parentId: dto.parentId,
    })
    if (!result.ok) return result

    auditMutation({
      entity: 'wiki_comment',
      action: 'create',
      actorId,
      targetId: result.value.id,
      meta: { wikiPageId },
    })

    return ok(toWikiCommentDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
    commentId: string,
    dto: UpdateWikiCommentDTO,
  ): Promise<Result<WikiCommentDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const pageCheck = await assertWikiPageInWorkspace(wikiPageId, workspaceId)
    if (!pageCheck.ok) return pageCheck

    const existing = await WikiCommentRepository.findById(commentId)
    if (!existing.ok) return existing
    if (existing.value.wikiPageId !== wikiPageId) {
      return err(wikiCommentNotFound())
    }
    if (existing.value.authorId !== actorId) return err(wikiCommentForbidden())

    const result = await WikiCommentRepository.update(
      commentId,
      dto.content as Prisma.InputJsonValue,
    )
    if (!result.ok) return result

    auditMutation({
      entity: 'wiki_comment',
      action: 'update',
      actorId,
      targetId: commentId,
    })

    return ok(toWikiCommentDTO(result.value))
  },

  async resolve(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
    commentId: string,
    dto: ResolveWikiCommentDTO,
  ): Promise<Result<WikiCommentDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const pageCheck = await assertWikiPageInWorkspace(wikiPageId, workspaceId)
    if (!pageCheck.ok) return pageCheck

    const existing = await WikiCommentRepository.findById(commentId)
    if (!existing.ok) return existing
    if (existing.value.wikiPageId !== wikiPageId) {
      return err(wikiCommentNotFound())
    }
    if (existing.value.parentId) {
      return err(
        wikiCommentForbidden('Só a raiz de uma discussão pode ser resolvida'),
      )
    }

    const result = await WikiCommentRepository.resolve(commentId, {
      resolved: dto.resolved,
      resolvedById: dto.resolved ? actorId : null,
    })
    if (!result.ok) return result

    auditMutation({
      entity: 'wiki_comment',
      action: dto.resolved ? 'resolve' : 'unresolve',
      actorId,
      targetId: commentId,
    })

    return ok(toWikiCommentDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    wikiPageId: string,
    commentId: string,
  ): Promise<Result<void>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const pageCheck = await assertWikiPageInWorkspace(wikiPageId, workspaceId)
    if (!pageCheck.ok) return pageCheck

    const existing = await WikiCommentRepository.findById(commentId)
    if (!existing.ok) return existing
    if (existing.value.wikiPageId !== wikiPageId) {
      return err(wikiCommentNotFound())
    }

    const isAuthor = existing.value.authorId === actorId
    if (!isAuthor && !membership.value.isPrivileged) {
      return err(wikiCommentForbidden())
    }

    const result = await WikiCommentRepository.delete(commentId)
    if (!result.ok) return result

    auditMutation({
      entity: 'wiki_comment',
      action: 'delete',
      actorId,
      targetId: commentId,
      meta: { wikiPageId },
    })

    return ok(undefined)
  },
}
