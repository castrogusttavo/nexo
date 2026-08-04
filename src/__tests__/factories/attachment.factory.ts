import { createId } from '@paralleldrive/cuid2'
import type { Attachment } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeAttachment(
  overrides?: Partial<Attachment>,
): Attachment {
  const now = new Date()
  return {
    id: createId(),
    fileName: 'diagram.png',
    contentType: 'image/png',
    size: 2048,
    bucket: 'issue-attachments',
    key: `issue-1/${createId()}.png`,
    issueId: createId(),
    uploadedById: createId(),
    createdAt: now,
    ...overrides,
  }
}

export function seedAttachment(
  issueId: string,
  uploadedById: string,
  overrides?: Partial<
    Pick<Attachment, 'fileName' | 'contentType' | 'size' | 'bucket' | 'key'>
  >,
) {
  return prisma.attachment.create({
    data: {
      fileName: 'diagram.png',
      contentType: 'image/png',
      size: 2048,
      bucket: 'issue-attachments',
      key: `${issueId}/${createId()}.png`,
      issueId,
      uploadedById,
      ...overrides,
    },
  })
}
