import { createId } from '@paralleldrive/cuid2'
import { auditMutation } from '@/lib/axiom/audit'
import {
  projectAttachmentLimitReached,
  projectAttachmentNotFound,
} from '@/src/errors'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'
import { getPresignedDownloadUrl } from '@/src/lib/storage/s3'
import { toProjectAttachmentDTO } from '@/src/mappers/project-resource.mapper'
import { ProjectAttachmentRepository } from '@/src/repositories/project-attachment.repository'
import type { ProjectAttachmentDTO } from '@/types/project-attachment'
import { authorizeProject } from './_project-scope'
import {
  persistAttachment,
  removeAttachmentObject,
  validateAttachment,
} from './issue/_attachment'

const PROJECT_ATTACHMENTS_BUCKET = 'project-attachments'
const MAX_ATTACHMENTS = 20
const DOWNLOAD_TTL_SECONDS = 60 * 60 // 1 hour

interface UploadFile {
  buffer: Buffer
  contentType: string
  fileName: string
}

export const ProjectAttachmentService = {
  async list(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectAttachmentDTO[]>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'read')
    if (!project.ok) return project

    const rows = await ProjectAttachmentRepository.listByProject(
      project.value.id,
    )
    if (!rows.ok) return rows

    const dtos = await Promise.all(
      rows.value.map(async (row) =>
        toProjectAttachmentDTO(
          row,
          await getPresignedDownloadUrl({
            bucket: row.bucket,
            key: row.key,
            expiresInSeconds: DOWNLOAD_TTL_SECONDS,
            downloadFileName: row.fileName,
          }),
        ),
      ),
    )

    return ok(dtos)
  },

  async upload(
    actorId: string,
    workspaceId: string,
    slug: string,
    file: UploadFile,
  ): Promise<Result<ProjectAttachmentDTO>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'manage')
    if (!project.ok) return project

    const count = await ProjectAttachmentRepository.countByProject(
      project.value.id,
    )
    if (!count.ok) return count
    if (count.value >= MAX_ATTACHMENTS)
      return err(projectAttachmentLimitReached())

    const validation = validateAttachment(file.contentType, file.buffer)
    if (!validation.ok) return validation

    const key = `${project.value.id}/${createId()}`
    const persisted = await persistAttachment({
      bucket: PROJECT_ATTACHMENTS_BUCKET,
      key,
      body: file.buffer,
      contentType: file.contentType,
    })
    if (!persisted.ok) return persisted

    const created = await ProjectAttachmentRepository.create({
      fileName: file.fileName,
      contentType: file.contentType,
      size: file.buffer.byteLength,
      bucket: PROJECT_ATTACHMENTS_BUCKET,
      key,
      projectId: project.value.id,
      uploadedById: actorId,
    })
    if (!created.ok) {
      await removeAttachmentObject(PROJECT_ATTACHMENTS_BUCKET, key)
      return created
    }

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.value.id,
      reason: 'add_attachment',
      meta: { attachmentId: created.value.id },
    })

    const url = await getPresignedDownloadUrl({
      bucket: created.value.bucket,
      key: created.value.key,
      expiresInSeconds: DOWNLOAD_TTL_SECONDS,
      downloadFileName: created.value.fileName,
    })

    return ok(toProjectAttachmentDTO(created.value, url))
  },

  async remove(
    actorId: string,
    workspaceId: string,
    slug: string,
    attachmentId: string,
  ): Promise<Result<void>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'manage')
    if (!project.ok) return project

    const attachment = await ProjectAttachmentRepository.findById(attachmentId)
    if (!attachment.ok) return attachment
    if (attachment.value.projectId !== project.value.id) {
      return err(projectAttachmentNotFound())
    }

    const removed = await ProjectAttachmentRepository.delete(attachmentId)
    if (!removed.ok) return removed

    await removeAttachmentObject(attachment.value.bucket, attachment.value.key)

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.value.id,
      reason: 'remove_attachment',
      meta: { attachmentId },
    })

    return ok(undefined)
  },
}
