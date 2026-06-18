import type { Project } from '@prisma/client'
import type { ProjectDTO } from '@/types/project'

export function toProjectDTO(
  project: Project,
  isFavorited = false,
): ProjectDTO {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? null,
    emoji: project.emoji ?? null,
    coverImage: project.coverImage ?? null,
    isPublic: project.isPublic,
    isFavorited,
    leadId: project.leadId,
    workspaceId: project.workspaceId,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    createdAt: project.createdAt?.toISOString(),
    updatedAt: project.updatedAt?.toISOString(),
  }
}
