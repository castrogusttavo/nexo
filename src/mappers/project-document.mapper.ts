import type { Project } from '@prisma/client'
import type { ProjectDocumentDTO } from '@/types/project-document'

export function toProjectDocumentDTO(
  project: Pick<Project, 'document' | 'documentUpdatedAt'>,
): ProjectDocumentDTO {
  return {
    content: Array.isArray(project.document)
      ? (project.document as ProjectDocumentDTO['content'])
      : [],
    updatedAt: project.documentUpdatedAt?.toISOString() ?? null,
  }
}
