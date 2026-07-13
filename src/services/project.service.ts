import { auditMutation } from '@/lib/axiom/audit'
import type { ProjectDTO, ProjectMemberDTO } from '@/types/project'
import { projectForbidden, projectMemberNotInWorkspace } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toProjectDTO, toProjectMemberDTO } from '../mappers/project.mapper'
import { ProjectRepository } from '../repositories/project.repository'
import type {
  CreateProjectDTO,
  ListProjectsDTO,
  UpdateProjectDTO,
} from '../schemas/project.schema'
import { assertMember } from './_authz'

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
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const result = await ProjectRepository.findByWorkspaceAndSlug(
      workspaceId,
      slug,
      actorId,
    )
    if (!result.ok) return result

    const project = result.value
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

    return ok(toProjectDTO(project, project.favourites.length > 0))
  },

  async listMembers(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectMemberDTO[]>> {
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

    const result = await ProjectRepository.create({
      ...dto,
      leadId: actorId,
      workspaceId,
    })

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

    const result = await ProjectRepository.update(project.id, dto)
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
