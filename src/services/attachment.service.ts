import { createId } from '@paralleldrive/cuid2'
import { auditMutation } from '@/lib/axiom/audit'
import type { AttachmentDTO } from '@/types/attachment'
import { attachmentNotFound, issueForbidden, issueNotFound } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { getPresignedDownloadUrl } from '../lib/storage/s3'
import { toAttachmentDTO } from '../mappers/attachment.mapper'
import { AttachmentRepository } from '../repositories/attachment.repository'
import { IssueRepository } from '../repositories/issue.repository'
import { resolveProject } from './_project-scope'
import {
  ISSUE_ATTACHMENTS_BUCKET,
  persistAttachment,
  removeAttachmentObject,
  validateAttachment,
} from './issue/_attachment'

const DOWNLOAD_TTL_SECONDS = 60 * 60 // 1 hour

interface UploadFile {
  buffer: Buffer
  contentType: string
  fileName: string
}

async function assertIssueInProject(
  issueId: string,
  projectId: string,
): Promise<Result<void>> {
  const issueResult = await IssueRepository.findById(issueId)
  if (!issueResult.ok) return issueResult
  if (issueResult.value.projectId !== projectId) return err(issueNotFound())
  return ok(undefined)
}

export const AttachmentService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<AttachmentDTO[]>> {
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

    const result = await AttachmentRepository.listByIssue(issueId)
    if (!result.ok) return result

    const dtos = await Promise.all(
      result.value.map(async (attachment) => {
        const url = await getPresignedDownloadUrl({
          bucket: attachment.bucket,
          key: attachment.key,
          expiresInSeconds: DOWNLOAD_TTL_SECONDS,
        })
        return toAttachmentDTO(attachment, url)
      }),
    )

    return ok(dtos)
  },

  async upload(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    file: UploadFile,
  ): Promise<Result<AttachmentDTO>> {
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

    const validation = validateAttachment(file.contentType, file.buffer)
    if (!validation.ok) return validation

    const key = `${issueId}/${createId()}`
    const persisted = await persistAttachment({
      key,
      body: file.buffer,
      contentType: file.contentType,
    })
    if (!persisted.ok) return persisted

    const result = await AttachmentRepository.create({
      fileName: file.fileName,
      contentType: file.contentType,
      size: file.buffer.byteLength,
      bucket: ISSUE_ATTACHMENTS_BUCKET,
      key,
      issueId,
      uploadedById: actorId,
    })
    if (!result.ok) {
      await removeAttachmentObject(ISSUE_ATTACHMENTS_BUCKET, key)
      return result
    }

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'add_attachment',
      meta: { attachmentId: result.value.id },
    })

    const url = await getPresignedDownloadUrl({
      bucket: result.value.bucket,
      key: result.value.key,
      expiresInSeconds: DOWNLOAD_TTL_SECONDS,
    })

    return ok(toAttachmentDTO(result.value, url))
  },

  async remove(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    attachmentId: string,
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

    const attachment = await AttachmentRepository.findById(attachmentId)
    if (!attachment.ok) return attachment
    if (attachment.value.issueId !== issueId) return err(attachmentNotFound())

    const result = await AttachmentRepository.delete(attachmentId)
    if (!result.ok) return result

    await removeAttachmentObject(attachment.value.bucket, attachment.value.key)

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'remove_attachment',
      meta: { attachmentId },
    })

    return ok(undefined)
  },
}
