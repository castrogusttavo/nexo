import type { Update } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { UpdateDTO, UpdateReplyDTO, UpdatesPageDTO } from '@/types/updates'
import {
  projectForbidden,
  updateDisabled,
  updateForbidden,
  updateNotFound,
  updateReplyNotFound,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toUpdateDTO, toUpdateReplyDTO } from '../mappers/update.mapper'
import type { ProjectWithDetails } from '../repositories/project.repository'
import { UpdateRepository } from '../repositories/update.repository'
import { UpdateReactionRepository } from '../repositories/update-reaction.repository'
import { UpdateReplyRepository } from '../repositories/update-reply.repository'
import type {
  CreateUpdateDTO,
  CreateUpdateReplyDTO,
  EditUpdateDTO,
  EditUpdateReplyDTO,
  ListUpdatesQuery,
} from '../schemas/update.schema'
import { resolveProject } from './_project-scope'

interface Access {
  project: ProjectWithDetails
  // OWNER, ADMIN or the project lead: may remove what others wrote.
  canModerate: boolean
}

async function authorize(
  actorId: string,
  workspaceId: string,
  projectSlug: string,
  need: 'see' | 'write',
): Promise<Result<Access>> {
  const resolved = await resolveProject(actorId, workspaceId, projectSlug)
  if (!resolved.ok) return err(resolved.error)

  const { membership, project } = resolved
  const canModerate = membership.isPrivileged || project.leadId === actorId
  const canSee =
    canModerate ||
    project.isPublic ||
    project.members.some((m) => m.userId === actorId)

  if (!canSee) return err(projectForbidden())
  if (need === 'write' && membership.role === 'VIEWER')
    return err(updateForbidden())
  if (!project.updatesEnabled) return err(updateDisabled())

  return ok({ project, canModerate })
}

async function findUpdateOf(
  project: ProjectWithDetails,
  updateId: string,
): Promise<Result<Update>> {
  const found = await UpdateRepository.findById(updateId)
  if (!found.ok) return found
  if (found.value.projectId !== project.id) return err(updateNotFound())
  return found
}

export const UpdateService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    query: ListUpdatesQuery,
  ): Promise<Result<UpdatesPageDTO>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'see')
    if (!access.ok) return access

    const page = await UpdateRepository.listByProject(
      access.value.project.id,
      query,
    )
    if (!page.ok) return page

    return ok({
      updates: page.value.updates.map((u) => toUpdateDTO(u, actorId)),
      nextCursor: page.value.nextCursor,
    })
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateUpdateDTO,
  ): Promise<Result<UpdateDTO>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const created = await UpdateRepository.createForProject({
      projectId: access.value.project.id,
      authorId: actorId,
      status: dto.status,
      content: dto.content,
    })
    if (!created.ok) return created

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: access.value.project.id,
      reason: 'post_update',
      meta: { updateId: created.value.id, status: dto.status },
    })

    return ok(toUpdateDTO(created.value, actorId))
  },

  async edit(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
    dto: EditUpdateDTO,
  ): Promise<Result<UpdateDTO>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const existing = await findUpdateOf(access.value.project, updateId)
    if (!existing.ok) return existing
    if (existing.value.authorId !== actorId) return err(updateForbidden())

    const edited = await UpdateRepository.update(updateId, dto)
    if (!edited.ok) return edited

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: access.value.project.id,
      reason: 'edit_update',
      meta: { updateId },
    })

    return ok(toUpdateDTO(edited.value, actorId))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
  ): Promise<Result<void>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const existing = await findUpdateOf(access.value.project, updateId)
    if (!existing.ok) return existing
    if (existing.value.authorId !== actorId && !access.value.canModerate)
      return err(updateForbidden())

    const deleted = await UpdateRepository.delete(updateId)
    if (!deleted.ok) return deleted

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: access.value.project.id,
      reason: 'delete_update',
      meta: { updateId },
    })
    return ok(undefined)
  },

  async listReplies(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
  ): Promise<Result<UpdateReplyDTO[]>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'see')
    if (!access.ok) return access

    const update = await findUpdateOf(access.value.project, updateId)
    if (!update.ok) return update

    const replies = await UpdateReplyRepository.listByUpdate(updateId)
    if (!replies.ok) return replies

    return ok(replies.value.map(toUpdateReplyDTO))
  },

  async reply(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
    dto: CreateUpdateReplyDTO,
  ): Promise<Result<UpdateReplyDTO>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const update = await findUpdateOf(access.value.project, updateId)
    if (!update.ok) return update

    const created = await UpdateReplyRepository.create({
      updateId,
      authorId: actorId,
      content: dto.content,
    })
    if (!created.ok) return created

    return ok(toUpdateReplyDTO(created.value))
  },

  async editReply(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
    replyId: string,
    dto: EditUpdateReplyDTO,
  ): Promise<Result<UpdateReplyDTO>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const update = await findUpdateOf(access.value.project, updateId)
    if (!update.ok) return update

    const reply = await UpdateReplyRepository.findById(replyId)
    if (!reply.ok) return reply
    if (reply.value.updateId !== updateId) return err(updateReplyNotFound())
    if (reply.value.authorId !== actorId) return err(updateForbidden())

    const edited = await UpdateReplyRepository.update(replyId, dto)
    if (!edited.ok) return edited

    return ok(toUpdateReplyDTO(edited.value))
  },

  async deleteReply(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
    replyId: string,
  ): Promise<Result<void>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const update = await findUpdateOf(access.value.project, updateId)
    if (!update.ok) return update

    const reply = await UpdateReplyRepository.findById(replyId)
    if (!reply.ok) return reply
    if (reply.value.updateId !== updateId) return err(updateReplyNotFound())
    if (reply.value.authorId !== actorId && !access.value.canModerate)
      return err(updateForbidden())

    return UpdateReplyRepository.delete(replyId)
  },

  async react(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
    emoji: string,
  ): Promise<Result<void>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const update = await findUpdateOf(access.value.project, updateId)
    if (!update.ok) return update

    return UpdateReactionRepository.add({ updateId, userId: actorId, emoji })
  },

  async unreact(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    updateId: string,
    emoji: string,
  ): Promise<Result<void>> {
    const access = await authorize(actorId, workspaceId, projectSlug, 'write')
    if (!access.ok) return access

    const update = await findUpdateOf(access.value.project, updateId)
    if (!update.ok) return update

    return UpdateReactionRepository.remove({ updateId, userId: actorId, emoji })
  },
}
