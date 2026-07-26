import type { Project } from '@prisma/client'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import type { ProjectMemberWithUser } from '../repositories/project.repository'
import { withTimestamps } from './_shared'

export function toProjectDTO(
  project: Project,
  isFavorited = false,
): ProjectDTO {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    identifier: project.identifier,
    description: project.description ?? null,
    emoji: project.emoji ?? null,
    coverImage: project.coverImage ?? null,
    isPublic: project.isPublic,
    issueTypesEnabled: project.issueTypesEnabled,
    modulesEnabled: project.modulesEnabled,
    cyclesEnabled: project.cyclesEnabled,
    isFavorited,
    leadId: project.leadId,
    workspaceId: project.workspaceId,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    ...withTimestamps(project),
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
