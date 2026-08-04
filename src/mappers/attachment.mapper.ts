import type { Attachment } from '@prisma/client'
import type { AttachmentDTO } from '@/types/attachment'

export function toAttachmentDTO(
  attachment: Attachment,
  url: string,
): AttachmentDTO {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
    url,
    issueId: attachment.issueId,
    uploadedById: attachment.uploadedById,
    createdAt: attachment.createdAt.toISOString(),
  }
}
