import { auditMutation } from '@/lib/axiom/audit'
import type { ProjectStateDTO } from '@/types/project-state'
import {
  projectStateForbidden,
  projectStateIsDefault,
  projectStateLastInGroup,
  projectStateNotFound,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toProjectStateDTO } from '../mappers/project-state.mapper'
import { ProjectStateRepository } from '../repositories/project-state.repository'
import type {
  CreateProjectStateDTO,
  UpdateProjectStateDTO,
} from '../schemas/project-state.schema'
import { assertMember } from './_authz'

// Any member reads the states; only OWNER/ADMIN configure them. The switch
// on the workspace is not checked here: an admin may prepare the states
// before turning them on.
async function assertCanConfigure(
  actorId: string,
  workspaceId: string,
): Promise<Result<void>> {
  const membership = await assertMember(actorId, workspaceId)
  if (!membership.ok) return membership
  if (!membership.value.isPrivileged) return err(projectStateForbidden())
  return ok(undefined)
}

// A state of another workspace answers as missing, so an id from elsewhere
// reveals nothing about it.
async function findOwnState(stateId: string, workspaceId: string) {
  const state = await ProjectStateRepository.findById(stateId)
  if (!state.ok) return state
  if (state.value.workspaceId !== workspaceId) {
    return err(projectStateNotFound())
  }
  return state
}

export const ProjectStateService = {
  async list(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<ProjectStateDTO[]>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const result = await ProjectStateRepository.listByWorkspace(workspaceId)
    if (!result.ok) return result

    return ok(result.value.map(toProjectStateDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    dto: CreateProjectStateDTO,
  ): Promise<Result<ProjectStateDTO>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const result = await ProjectStateRepository.create({ ...dto, workspaceId })
    if (!result.ok) {
      auditMutation({
        entity: 'project_state',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'project_state',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toProjectStateDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    stateId: string,
    dto: UpdateProjectStateDTO,
  ): Promise<Result<ProjectStateDTO>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const state = await findOwnState(stateId, workspaceId)
    if (!state.ok) return state

    const result = await ProjectStateRepository.update(stateId, dto)
    if (!result.ok) return result

    auditMutation({
      entity: 'project_state',
      action: 'update',
      actorId,
      targetId: stateId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toProjectStateDTO(result.value))
  },

  // The projects in the deleted state move to another state of the same
  // group; the caller gets where they went and how many, to tell the user.
  async delete(
    actorId: string,
    workspaceId: string,
    stateId: string,
  ): Promise<Result<{ movedTo: string; count: number }>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const state = await findOwnState(stateId, workspaceId)
    if (!state.ok) return state
    if (state.value.isDefault) return err(projectStateIsDefault())

    const count = await ProjectStateRepository.countByGroup(
      workspaceId,
      state.value.group,
    )
    if (!count.ok) return count
    if (count.value <= 1) return err(projectStateLastInGroup())

    const result = await ProjectStateRepository.deleteMovingProjects(stateId)
    if (!result.ok) return result

    auditMutation({
      entity: 'project_state',
      action: 'delete',
      actorId,
      targetId: stateId,
      meta: { movedTo: result.value.movedTo, moved: result.value.count },
    })

    return ok(result.value)
  },

  async setDefault(
    actorId: string,
    workspaceId: string,
    stateId: string,
  ): Promise<Result<ProjectStateDTO>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const state = await findOwnState(stateId, workspaceId)
    if (!state.ok) return state

    const result = await ProjectStateRepository.setDefault(stateId, workspaceId)
    if (!result.ok) return result

    auditMutation({
      entity: 'project_state',
      action: 'update',
      actorId,
      targetId: stateId,
      meta: { fields: ['isDefault'] },
    })

    return ok(toProjectStateDTO(result.value))
  },
}
