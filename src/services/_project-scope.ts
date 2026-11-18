import { projectForbidden } from '@/src/errors'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'
import type { AppError } from '../errors/app-error'
import {
  ProjectRepository,
  type ProjectWithDetails,
} from '../repositories/project.repository'
import { assertMember, type MembershipContext } from './_authz'

type ResolvedProject =
  | { ok: true; membership: MembershipContext; project: ProjectWithDetails }
  | { ok: false; error: AppError }

type ProjectNeed = 'read' | 'react' | 'manage'

export async function resolveProject(
  actorId: string,
  workspaceId: string,
  projectSlug: string,
): Promise<ResolvedProject> {
  const [membership, projectResult] = await Promise.all([
    assertMember(actorId, workspaceId),
    ProjectRepository.findByWorkspaceAndSlug(workspaceId, projectSlug, actorId),
  ])

  if (!membership.ok) return { ok: false, error: membership.error }
  if (!projectResult.ok) return { ok: false, error: projectResult.error }

  return {
    ok: true,
    membership: membership.value,
    project: projectResult.value,
  }
}

// One definition of "who may read / edit" for the project's own surfaces,
// the same rule ProjectService.getBySlug() and update() apply.
export function projectAccess(
  project: {
    leadId: string | null
    isPublic: boolean
    members: { userId: string }[]
  },
  membership: MembershipContext,
  actorId: string,
): { canRead: boolean; canWrite: boolean } {
  const isLead = project.leadId === actorId
  const isMember = project.members.some((m) => m.userId === actorId)
  return {
    canRead: project.isPublic || membership.isPrivileged || isLead || isMember,
    canWrite: membership.isPrivileged || isLead,
  }
}

// read: anyone who sees the project. react: readers except VIEWER.
// manage: the lead or ADMIN/OWNER
export async function authorizeProject(
  actorId: string,
  workspaceId: string,
  projectSlug: string,
  need: ProjectNeed,
): Promise<Result<ProjectWithDetails>> {
  const resolved = await resolveProject(actorId, workspaceId, projectSlug)
  if (!resolved.ok) return err(resolved.error)

  const { project, membership } = resolved
  const { canRead, canWrite } = projectAccess(project, membership, actorId)

  if (!canRead) return err(projectForbidden())
  if (need === 'react' && membership.role === 'VIEWER') {
    return err(projectForbidden('Visualizadores não podem reagir'))
  }
  if (need === 'manage' && !canWrite) {
    return err(
      projectForbidden(
        'Apenas o lead ou ADMIN/OWNER podem gerenciar links e anexos',
      ),
    )
  }

  return ok(project)
}
