import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import type {
  ProjectMemberWithUser,
  ProjectWithLabels,
} from '../repositories/project.repository'
import { withTimestamps } from './_shared'

export function toProjectDTO(
  project: ProjectWithLabels,
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
    estimatesEnabled: project.estimatesEnabled,
    isFavorited,
    leadId: project.leadId,
    stateId: project.stateId,
    labelIds: project.labelAssignments.map((a) => a.labelId),
    workspaceId: project.workspaceId,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    ...withTimestamps(project),
  }
}

export function toProjectMemberDTO(
  member: ProjectMemberWithUser,
  leadId: string | null,
): ProjectMemberDTO {
  return {
    userId: member.userId,
    name: member.user.name,
    username: member.user.username,
    image: member.user.image ?? null,
    email: member.user.email,
    isLead: member.userId === leadId,
    createdAt: member.createdAt.toISOString(),
  }
}
