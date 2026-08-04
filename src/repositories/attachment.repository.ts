import type { Attachment } from '@prisma/client'
import { attachmentNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const AttachmentRepository = {
  async findById(id: string): Promise<Result<Attachment>> {
    try {
      const attachment = await prisma.attachment.findUnique({ where: { id } })
      if (!attachment) return err(attachmentNotFound())
      return ok(attachment)
    } catch (error) {
      return err(dbError('Failed to find attachment by id', error))
    }
  },

  async listByIssue(issueId: string): Promise<Result<Attachment[]>> {
    try {
      const attachments = await prisma.attachment.findMany({
        where: { issueId },
        orderBy: { createdAt: 'asc' },
      })
      return ok(attachments)
    } catch (error) {
      return err(dbError('Failed to list attachments', error))
    }
  },

  async create(data: {
    fileName: string
    contentType: string
    size: number
    bucket: string
    key: string
    issueId: string
    uploadedById: string
  }): Promise<Result<Attachment>> {
    try {
      const attachment = await prisma.attachment.create({ data })
      return ok(attachment)
    } catch (error) {
      return err(dbError('Failed to create attachment', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.attachment.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(attachmentNotFound())
      }
      return err(dbError('Failed to delete attachment', error))
    }
  },
}
