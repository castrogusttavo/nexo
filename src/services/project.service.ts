import { auditMutation } from '@/lib/axiom/audit'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import {
  projectDateRangeInvalid,
  projectForbidden,
  projectLabelInvalid,
  projectLabelsDisabled,
  projectMemberNotFound,
  projectMemberNotInWorkspace,
  projectStateInvalid,
  projectStatesDisabled,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toProjectDTO, toProjectMemberDTO } from '../mappers/project.mapper'
import { ProjectRepository } from '../repositories/project.repository'
import { ProjectLabelRepository } from '../repositories/project-label.repository'
import { ProjectStateRepository } from '../repositories/project-state.repository'
import { WorkspaceRepository } from '../repositories/workspace.repository'
import type {
  CreateProjectDTO,
  ListProjectsDTO,
  UpdateProjectDTO,
} from '../schemas/project.schema'
import { assertMember } from './_authz'
import { resolveProject } from './_project-scope'

// A project may only take a state or labels of its own workspace, and only
// while the workspace has that feature switched on. A missing id and a
// foreign one answer alike, so the response reveals nothing about other
// workspaces. Both switches live on the workspace, read once for both.
async function resolveProjectProperties(
  workspaceId: string,
  dto: Pick<UpdateProjectDTO, 'stateId' | 'labelIds'>,
): Promise<Result<{ labelIds?: string[] }>> {
  if (!dto.stateId && dto.labelIds === undefined) return ok({})

  const workspace = await WorkspaceRepository.findById(workspaceId)
  if (!workspace.ok) return workspace

  if (dto.stateId) {
    if (!workspace.value.projectStatesEnabled) {
      return err(projectStatesDisabled())
    }
    const state = await ProjectStateRepository.findById(dto.stateId)
    if (!state.ok) {
      return state.error.code === 'PROJECT_STATE_NOT_FOUND'
        ? err(projectStateInvalid())
        : state
    }
    if (state.value.workspaceId !== workspaceId) {
      return err(projectStateInvalid())
    }
  }

  if (dto.labelIds === undefined) return ok({})
  // Clearing labels is still touching them, so the switch applies to [].
  if (!workspace.value.projectLabelsEnabled) return err(projectLabelsDisabled())

  const labelIds = [...new Set(dto.labelIds)]
  if (labelIds.length > 0) {
    const count = await ProjectLabelRepository.countInWorkspace(
      workspaceId,
      labelIds,
    )
    if (!count.ok) return count
    if (count.value !== labelIds.length) return err(projectLabelInvalid())
  }

  return ok({ labelIds })
}

// The schema already refuses a pair sent in the wrong order; a lone date is
// checked against the one stored on the project. Only the dates being sent
// are judged, so a project already out of order can still take other edits.
function resolveDates(
  stored: { startDate: Date | null; dueDate: Date | null },
  dto: Pick<UpdateProjectDTO, 'startDate' | 'dueDate'>,
): Result<{ startDate?: Date | null; dueDate?: Date | null }> {
  if (dto.startDate === undefined && dto.dueDate === undefined) return ok({})

  const toDate = (value: string | null | undefined) =>
    value === undefined ? undefined : value === null ? null : new Date(value)
  const startDate = toDate(dto.startDate)
  const dueDate = toDate(dto.dueDate)

  const start = startDate === undefined ? stored.startDate : startDate
  const due = dueDate === undefined ? stored.dueDate : dueDate
  if (start && due && start > due) return err(projectDateRangeInvalid())

  return ok({
    ...(startDate !== undefined && { startDate }),
    ...(dueDate !== undefined && { dueDate }),
  })
}

function baseIdentifierFrom(name: string): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const base = cleaned.slice(0, 6)
  return base.length >= 2 ? base : base.padEnd(2, 'X')
}

function nextIdentifierCandidate(base: string, attempt: number): string {
  const suffix = String(attempt)
  return `${base.slice(0, 10 - suffix.length)}${suffix}`
}

export const ProjectService = {
  async list(
    actorId: string,
    workspaceId: string,
    options: ListProjectsDTO,
  ): Promise<Result<ProjectDTO[]>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const result = await ProjectRepository.listByWorkspace(
      workspaceId,
      actorId,
      membership.value.isPrivileged,
      options,
    )
    if (!result.ok) return result

    return ok(result.value.map((p) => toProjectDTO(p, p.favourites.length > 0)))
  },

  async getBySlug(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, slug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    return ok(toProjectDTO(project, project.favourites.length > 0))
  },

  async listMembers(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectMemberDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, slug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await ProjectRepository.listMembers(project.id)
    if (!result.ok) return result

    return ok(result.value.map((m) => toProjectMemberDTO(m, project.leadId)))
  },

  async addMember(
    actorId: string,
    workspaceId: string,
    slug: string,
    targetUserId: string,
  ): Promise<Result<ProjectMemberDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const projectResult = await ProjectRepository.findByWorkspaceAndSlug(
      workspaceId,
      slug,
      actorId,
    )
    if (!projectResult.ok) return projectResult
    const project = projectResult.value

    const isLead = project.leadId === actorId
    if (!membership.value.isPrivileged && !isLead) {
      return err(projectForbidden('Sem permissão para gerenciar membros'))
    }

    const targetMembership = await assertMember(targetUserId, workspaceId)
    if (!targetMembership.ok) return err(projectMemberNotInWorkspace())

    const result = await ProjectRepository.addMember(targetUserId, project.id)
    if (!result.ok) return result

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.id,
      reason: 'member_added',
      meta: { targetUserId },
    })

    return ok(toProjectMemberDTO(result.value, project.leadId))
  },

  async removeMember(
    actorId: string,
    workspaceId: string,
    slug: string,
    targetUserId: string,
  ): Promise<Result<void>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const projectResult = await ProjectRepository.findByWorkspaceAndSlug(
      workspaceId,
      slug,
      actorId,
    )
    if (!projectResult.ok) return projectResult
    const project = projectResult.value

    const isLead = project.leadId === actorId
    if (!membership.value.isPrivileged && !isLead) {
      return err(projectForbidden('Sem permissão para gerenciar membros'))
    }

    if (targetUserId === project.leadId) {
      return err(projectForbidden('Não é possível remover o lead do projeto'))
    }

    const result = await ProjectRepository.removeMember(
      targetUserId,
      project.id,
    )
    if (!result.ok) return result

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.id,
      reason: 'member_removed',
      meta: { targetUserId },
    })

    return ok(undefined)
  },

  async create(
    actorId: string,
    workspaceId: string,
    dto: CreateProjectDTO,
  ): Promise<Result<ProjectDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const userProvidedIdentifier = dto.identifier
    const base = baseIdentifierFrom(dto.name)
    let identifier = userProvidedIdentifier ?? base
    let attempt = 1
    let result = await ProjectRepository.create({
      ...dto,
      identifier,
      leadId: actorId,
      workspaceId,
    })

    while (
      !result.ok &&
      result.error.code === 'PROJECT_IDENTIFIER_CONFLICT' &&
      !userProvidedIdentifier &&
      attempt < 5
    ) {
      attempt++
      identifier = nextIdentifierCandidate(base, attempt)
      result = await ProjectRepository.create({
        ...dto,
        identifier,
        leadId: actorId,
        workspaceId,
      })
    }

    if (!result.ok) {
      auditMutation({
        entity: 'project',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'project',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toProjectDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    slug: string,
    dto: UpdateProjectDTO,
  ): Promise<Result<ProjectDTO>> {
    const [membership, projectResult] = await Promise.all([
      assertMember(actorId, workspaceId),
      ProjectRepository.findByWorkspaceAndSlug(workspaceId, slug, actorId),
    ])

    if (!membership.ok) return membership
    if (!projectResult.ok) return projectResult

    const project = projectResult.value
    const isLead = project.leadId === actorId

    if (!membership.value.isPrivileged && !isLead) {
      auditMutation({
        entity: 'project',
        action: 'update',
        actorId,
        targetId: project.id,
        outcome: 'failure',
        reason: 'insufficient_role',
      })
      return err(
        projectForbidden('Apenas o lead ou ADMIN/OWNER podem editar o projeto'),
      )
    }

    if (dto.leadId && !project.members.some((m) => m.userId === dto.leadId)) {
      return err(projectMemberNotFound())
    }

    const dates = resolveDates(project, dto)
    if (!dates.ok) return dates

    const properties = await resolveProjectProperties(workspaceId, dto)
    if (!properties.ok) return properties

    // The dates go to the repository as Date, from resolveDates.
    const { startDate: _startDate, dueDate: _dueDate, ...fields } = dto
    const result = await ProjectRepository.update(project.id, {
      ...fields,
      ...dates.value,
      ...properties.value,
    })
    if (!result.ok) {
      auditMutation({
        entity: 'project',
        action: 'update',
        actorId,
        targetId: project.id,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.id,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toProjectDTO(result.value, project.favourites.length > 0))
  },

  async archive(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectDTO>> {
    const [membership, projectResult] = await Promise.all([
      assertMember(actorId, workspaceId),
      ProjectRepository.findByWorkspaceAndSlug(workspaceId, slug, actorId),
    ])

    if (!membership.ok) return membership
    if (!projectResult.ok) return projectResult

    const project = projectResult.value

    if (!membership.value.isPrivileged && project.leadId !== actorId) {
      return err(
        projectForbidden(
          'Apenas o lead ou ADMIN/OWNER podem arquivar o projeto',
        ),
      )
    }

    const result = await ProjectRepository.archive(project.id)
    if (!result.ok) return result

    auditMutation({
      entity: 'project',
      action: 'archive',
      actorId,
      targetId: project.id,
    })

    return ok(toProjectDTO(result.value, project.favourites.length > 0))
  },

  async restore(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectDTO>> {
    const [membership, projectResult] = await Promise.all([
      assertMember(actorId, workspaceId),
      ProjectRepository.findByWorkspaceAndSlug(workspaceId, slug, actorId),
    ])

    if (!membership.ok) return membership
    if (!projectResult.ok) return projectResult

    const project = projectResult.value

    if (!membership.value.isPrivileged && project.leadId !== actorId) {
      return err(
        projectForbidden(
          'Apenas o lead ou ADMIN/OWNER podem restaurar o projeto',
        ),
      )
    }

    const result = await ProjectRepository.restore(project.id)
    if (!result.ok) return result

    auditMutation({
      entity: 'project',
      action: 'restore',
      actorId,
      targetId: project.id,
    })

    return ok(toProjectDTO(result.value, project.favourites.length > 0))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<void>> {
    const [membership, projectResult] = await Promise.all([
      assertMember(actorId, workspaceId),
      ProjectRepository.findByWorkspaceAndSlug(workspaceId, slug, actorId),
    ])

    if (!membership.ok) return membership
    if (!projectResult.ok) return projectResult

    if (membership.value.role !== 'OWNER') {
      auditMutation({
        entity: 'project',
        action: 'delete',
        actorId,
        targetId: projectResult.value.id,
        outcome: 'failure',
        reason: 'insufficient_role',
        meta: { role: membership.value.role },
      })
      return err(
        projectForbidden(
          'Apenas o OWNER pode deletar permanentemente um projeto',
        ),
      )
    }

    const result = await ProjectRepository.delete(projectResult.value.id)
    if (!result.ok) return result

    auditMutation({
      entity: 'project',
      action: 'delete',
      actorId,
      targetId: projectResult.value.id,
      outcome: 'success',
    })

    return ok(undefined)
  },

  async favorite(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<{ favorited: boolean }>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const projectResult = await ProjectRepository.findByWorkspaceAndSlug(
      workspaceId,
      slug,
      actorId,
    )
    if (!projectResult.ok) return projectResult

    const project = projectResult.value
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (
      !project.isPublic &&
      !membership.value.isPrivileged &&
      !isLead &&
      !isMember
    ) {
      return err(projectForbidden())
    }

    const result = await ProjectRepository.addFavorite(actorId, project.id)
    if (!result.ok) return result

    return ok({ favorited: true })
  },

  async unfavorite(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<{ favorited: boolean }>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const projectResult = await ProjectRepository.findByWorkspaceAndSlug(
      workspaceId,
      slug,
      actorId,
    )
    if (!projectResult.ok) return projectResult

    const project = projectResult.value
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (
      !project.isPublic &&
      !membership.value.isPrivileged &&
      !isLead &&
      !isMember
    ) {
      return err(projectForbidden())
    }

    const result = await ProjectRepository.removeFavorite(actorId, project.id)
    if (!result.ok) return result

    return ok({ favorited: false })
  },
}
