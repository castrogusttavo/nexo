import type { Prisma } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { CommentDTO } from '@/types/comment'
import {
  commentForbidden,
  commentNestingTooDeep,
  commentNotFound,
  issueForbidden,
  issueNotFound,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toCommentDTO } from '../mappers/comment.mapper'
import { CommentRepository } from '../repositories/comment.repository'
import { IssueRepository } from '../repositories/issue.repository'
import type {
  CreateCommentDTO,
  UpdateCommentDTO,
} from '../schemas/comment.schema'
import { resolveProject } from './_project-scope'

async function assertIssueInProject(
  issueId: string,
  projectId: string,
): Promise<Result<void>> {
  const issueResult = await IssueRepository.findById(issueId)
  if (!issueResult.ok) return issueResult
  if (issueResult.value.projectId !== projectId) return err(issueNotFound())
  return ok(undefined)
}

export const CommentService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<CommentDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const result = await CommentRepository.listByIssue(issueId)
    if (!result.ok) return result

    return ok(result.value.map(toCommentDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dto: CreateCommentDTO,
  ): Promise<Result<CommentDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    if (dto.parentId) {
      const parent = await CommentRepository.findById(dto.parentId)
      if (!parent.ok) return parent
      if (parent.value.issueId !== issueId) return err(commentNotFound())
      if (parent.value.parentId) return err(commentNestingTooDeep())
    }

    const result = await CommentRepository.create({
      content: dto.content as Prisma.InputJsonValue,
      issueId,
      authorId: actorId,
      parentId: dto.parentId,
    })
    if (!result.ok) return result

    auditMutation({
      entity: 'comment',
      action: 'create',
      actorId,
      targetId: result.value.id,
      meta: { issueId },
    })

    return ok(toCommentDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    commentId: string,
    dto: UpdateCommentDTO,
  ): Promise<Result<CommentDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const existing = await CommentRepository.findById(commentId)
    if (!existing.ok) return existing
    if (existing.value.issueId !== issueId) return err(commentNotFound())
    if (existing.value.authorId !== actorId) return err(commentForbidden())

    const result = await CommentRepository.update(
      commentId,
      dto.content as Prisma.InputJsonValue,
    )
    if (!result.ok) return result

    auditMutation({
      entity: 'comment',
      action: 'update',
      actorId,
      targetId: commentId,
    })

    return ok(toCommentDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    commentId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const existing = await CommentRepository.findById(commentId)
    if (!existing.ok) return existing
    if (existing.value.issueId !== issueId) return err(commentNotFound())

    const isAuthor = existing.value.authorId === actorId
    if (!isAuthor && !membership.isPrivileged && !isLead) {
      return err(commentForbidden())
    }

    const result = await CommentRepository.delete(commentId)
    if (!result.ok) return result

    auditMutation({
      entity: 'comment',
      action: 'delete',
      actorId,
      targetId: commentId,
      meta: { issueId },
    })

    return ok(undefined)
  },
}
