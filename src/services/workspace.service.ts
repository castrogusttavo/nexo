import { UserCache } from '@/src/cache/user.cache'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toWorkspaceDTO } from '@/src/mappers/workspace.mapper'
import { UserRepository } from '@/src/repositories/user.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import type { CreateWorkspaceDTO, UpdateWorkspaceDTO } from '@/src/schemas/workspace.schema'
import type { WorkspaceDTO } from '@/types/workspace'

export const WorkspaceService = {
  async getById(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceDTO>> {
    const actor = await UserRepository.findById(actorId)
    if (!actor.ok) return actor

    if (actor.value.workspaceId !== workspaceId) {
      return err(forbidden())
    }

    const cached = await WorkspaceCache.get(workspaceId)
    if (cached) return ok(cached)

    const result = await WorkspaceRepository.findById(workspaceId)
    if (!result.ok) return result

    const dto = toWorkspaceDTO(result.value)
    await WorkspaceCache.set(workspaceId, dto)

    return ok(dto)
  },

  async create(
    actorId: string,
    dto: CreateWorkspaceDTO,
  ): Promise<Result<WorkspaceDTO>> {
    const actor = await UserRepository.findById(actorId)
    if (!actor.ok) return actor

    if (actor.value.workspaceId) {
      return err(forbidden('Usuário já pertence a um workspace'))
    }

    const result = await WorkspaceRepository.createWithOwner(dto, actorId)
    if (!result.ok) return result

    await UserCache.invalidate(actorId)

    return ok(toWorkspaceDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDTO,
  ): Promise<Result<WorkspaceDTO>> {
    const actor = await UserRepository.findById(actorId)
    if (!actor.ok) return actor

    if (actor.value.workspaceId !== workspaceId) {
      return err(forbidden())
    }

    if (!['OWNER', 'ADMIN'].includes(actor.value.role)) {
      return err(forbidden('Apenas OWNER ou ADMIN podem editar o workspace'))
    }

    const result = await WorkspaceRepository.update(workspaceId, dto)
    if (!result.ok) return result

    const workspaceDTO = toWorkspaceDTO(result.value)
    await WorkspaceCache.invalidate(workspaceId)

    return ok(workspaceDTO)
  },

  async delete(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<void>> {
    const actor = await UserRepository.findById(actorId)
    if (!actor.ok) return actor

    if (actor.value.workspaceId !== workspaceId) {
      return err(forbidden())
    }

    if (actor.value.role !== 'OWNER') {
      return err(forbidden('Apenas o OWNER pode deletar o workspace'))
    }

    const result = await WorkspaceRepository.delete(workspaceId)
    if (!result.ok) return result

    await WorkspaceCache.invalidate(workspaceId)

    return ok(undefined)
  },
}
