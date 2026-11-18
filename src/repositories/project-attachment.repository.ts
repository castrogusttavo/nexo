import type { ProjectAttachment } from '@prisma/client'
import { projectAttachmentNotFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'
import { dbError } from './db-error'

export const ProjectAttachmentRepository = {
  async findById(id: string): Promise<Result<ProjectAttachment>> {
    try {
      const row = await prisma.projectAttachment.findUnique({ where: { id } })
      if (!row) return err(projectAttachmentNotFound())
      return ok(row)
    } catch (error) {
      return err(dbError('Failed to find project attachment', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<ProjectAttachment[]>> {
    try {
      return ok(
        await prisma.projectAttachment.findMany({
          where: { projectId },
          orderBy: { createdAt: 'asc' },
        }),
      )
    } catch (error) {
      return err(dbError('Failed to list project attachments', error))
    }
  },

  async countByProject(projectId: string): Promise<Result<number>> {
    try {
      return ok(await prisma.projectAttachment.count({ where: { projectId } }))
    } catch (error) {
      return err(dbError('Failed to count project attachments', error))
    }
  },

  async create(data: {
    fileName: string
    contentType: string
    size: number
    bucket: string
    key: string
    projectId: string
    uploadedById: string
  }): Promise<Result<ProjectAttachment>> {
    try {
      return ok(await prisma.projectAttachment.create({ data }))
    } catch (error) {
      return err(dbError('Failed to create project attachment', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.projectAttachment.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(projectAttachmentNotFound())
      }
      return err(dbError('Failed to delete project attachment', error))
    }
  },
}
