import type { Prisma, Project } from '@prisma/client'
import { projectNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type ProjectDocumentAccess = Pick<
  Project,
  | 'id'
  | 'workspaceId'
  | 'leadId'
  | 'isPublic'
  | 'archivedAt'
  | 'documentYjsState'
  | 'document'
> & { members: { userId: string }[] }

export const ProjectDocumentRepository = {
  async findAccessById(id: string): Promise<Result<ProjectDocumentAccess>> {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          workspaceId: true,
          leadId: true,
          isPublic: true,
          archivedAt: true,
          document: true,
          documentYjsState: true,
          members: { select: { userId: true } },
        },
      })
      if (!project) return err(projectNotFound())
      return ok(project)
    } catch (error) {
      return err(dbError('Failed to find project document access', error))
    }
  },

  async updateContent(
    id: string,
    content: Prisma.InputJsonValue,
  ): Promise<Result<Pick<Project, 'document' | 'documentUpdatedAt'>>> {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { document: content, documentUpdatedAt: new Date() },
        select: { document: true, documentUpdatedAt: true },
      })
      return ok(project)
    } catch (error) {
      return err(dbError('Failed to persist project document', error))
    }
  },

  async updateYjsState(id: string, state: Uint8Array): Promise<Result<void>> {
    try {
      await prisma.project.update({
        where: { id },
        // Same ArrayBufferLike -> ArrayBuffer copy the wiki repository does.
        data: {
          documentYjsState: new Uint8Array(state),
          documentUpdatedAt: new Date(),
        },
        select: { id: true },
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to persist project document yjs state', error))
    }
  },
}
