import { auditMutation } from '@/lib/axiom/audit'
import { PLATFORM_ADMIN_EMAILS } from '@/lib/env/server'
import type { CareerJobDTO } from '@/types/career-job'
import { careerJobForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toCareerJobDTO } from '../mappers/career-job.mapper'
import { CareerJobRepository } from '../repositories/career-job.repository'
import type {
  ChangeCareerJobStatusDTO,
  CreateCareerJobDTO,
  UpdateCareerJobDTO,
} from '../schemas/career-job.schema'

function assertPlatformAdmin(email: string | null | undefined): Result<void> {
  if (!email || !PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase())) {
    return err(careerJobForbidden())
  }
  return ok(undefined)
}

export const CareerJobService = {
  async getBySlug(slug: string): Promise<Result<CareerJobDTO>> {
    const result = await CareerJobRepository.findBySlug(slug)
    if (!result.ok) return result

    return ok(toCareerJobDTO(result.value))
  },

  async listPublic(): Promise<Result<CareerJobDTO[]>> {
    const result = await CareerJobRepository.listPublic()
    if (!result.ok) return result

    return ok(result.value.map(toCareerJobDTO))
  },

  async getById(
    actorEmail: string | null,
    id: string,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actorEmail)
    if (!admin.ok) return admin

    const result = await CareerJobRepository.findById(id)
    if (!result.ok) return result

    return ok(toCareerJobDTO(result.value))
  },

  async listAll(actorEmail: string | null): Promise<Result<CareerJobDTO[]>> {
    const admin = assertPlatformAdmin(actorEmail)
    if (!admin.ok) return admin

    const result = await CareerJobRepository.listAll()
    if (!result.ok) return result

    return ok(result.value.map(toCareerJobDTO))
  },

  async create(
    actorId: string,
    actorEmail: string | null,
    dto: CreateCareerJobDTO,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actorEmail)
    if (!admin.ok) return admin

    const result = await CareerJobRepository.create(dto)
    if (!result.ok) {
      auditMutation({
        entity: 'career_job',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'career_job',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toCareerJobDTO(result.value))
  },

  async update(
    actorId: string,
    actorEmail: string | null,
    id: string,
    dto: UpdateCareerJobDTO,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actorEmail)
    if (!admin.ok) return admin

    const existing = await CareerJobRepository.findById(id)
    if (!existing.ok) return existing

    const result = await CareerJobRepository.update(id, dto)
    if (!result.ok) {
      auditMutation({
        entity: 'career_job',
        action: 'update',
        actorId,
        targetId: id,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'career_job',
      action: 'update',
      actorId,
      targetId: result.value.id,
    })

    return ok(toCareerJobDTO(result.value))
  },

  async changeStatus(
    actorId: string,
    actorEmail: string | null,
    id: string,
    dto: ChangeCareerJobStatusDTO,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actorEmail)
    if (!admin.ok) return admin

    const existing = await CareerJobRepository.findById(id)
    if (!existing.ok) return existing

    const result = await CareerJobRepository.changeStatus(id, dto.status)
    if (!result.ok) {
      auditMutation({
        entity: 'career_job',
        action: 'update',
        actorId,
        targetId: id,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'career_job',
      action: 'update',
      actorId,
      targetId: result.value.id,
    })

    return ok(toCareerJobDTO(result.value))
  },
}
