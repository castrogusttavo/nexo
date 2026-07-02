import type { Project } from '@prisma/client'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import type { ProjectMemberWithUser } from '../repositories/project.repository'

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

export function toProjectMemberDTO(
  member: ProjectMemberWithUser,
  leadId: string,
): ProjectMemberDTO {
  return {
    userId: member.userId,
    name: member.user.name,
    username: member.user.username,
    image: member.user.image ?? null,
    isLead: member.userId === leadId,
    createdAt: member.createdAt.toISOString(),
  }
}
