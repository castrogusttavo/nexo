import type { AppError } from '../errors/app-error'
import {
  ProjectRepository,
  type ProjectWithDetails,
} from '../repositories/project.repository'
import { assertMember, type MembershipContext } from './_authz'

type ResolvedProject =
  | { ok: true; membership: MembershipContext; project: ProjectWithDetails }
  | { ok: false; error: AppError }

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
