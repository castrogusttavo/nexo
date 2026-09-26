import { auditMutation } from '@/lib/axiom/audit'
import { getPlatformAdminEmails } from '@/lib/env/server-admin'
import type { CareerJobDTO } from '@/types/career-job'
import { adminTwoFactorRequired, careerJobForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toCareerJobDTO } from '../mappers/career-job.mapper'
import { CareerJobRepository } from '../repositories/career-job.repository'
import type {
  ChangeCareerJobStatusDTO,
  CreateCareerJobDTO,
  UpdateCareerJobDTO,
} from '../schemas/career-job.schema'

/**
 * Whoever is asking. Shaped so a route can pass the session user straight
 * through, which is also what keeps the two checks below honest: the second
 * factor is read from the same session that carries the e-mail, not from a
 * flag the caller assembles.
 */
export interface PlatformActor {
  id: string
  email?: string | null
  twoFactorEnabled?: boolean | null
}

function assertPlatformAdmin(actor: PlatformActor): Result<void> {
  // Read here, not at import: `listPublic` below serves /careers, a page with
  // no login, and it must not require admin credentials to exist.
  const email = actor.email?.toLowerCase()
  if (!email || !getPlatformAdminEmails().includes(email)) {
    return err(careerJobForbidden())
  }

  // Being on the allowlist is not enough. These endpoints publish public job
  // posts and read candidate data, so a single stolen password must not be
  // the whole story — and the distinct code lets the UI say "turn 2FA on"
  // instead of the dead end a generic 403 would be for a real admin.
  if (!actor.twoFactorEnabled) {
    return err(adminTwoFactorRequired())
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
    actor: PlatformActor,
    id: string,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actor)
    if (!admin.ok) return admin

    const result = await CareerJobRepository.findById(id)
    if (!result.ok) return result

    return ok(toCareerJobDTO(result.value))
  },

  async listAll(actor: PlatformActor): Promise<Result<CareerJobDTO[]>> {
    const admin = assertPlatformAdmin(actor)
    if (!admin.ok) return admin

    const result = await CareerJobRepository.listAll()
    if (!result.ok) return result

    return ok(result.value.map(toCareerJobDTO))
  },

  async create(
    actor: PlatformActor,
    dto: CreateCareerJobDTO,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actor)
    if (!admin.ok) return admin

    const result = await CareerJobRepository.create(dto)
    if (!result.ok) {
      auditMutation({
        entity: 'career_job',
        action: 'create',
        actorId: actor.id,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'career_job',
      action: 'create',
      actorId: actor.id,
      targetId: result.value.id,
    })

    return ok(toCareerJobDTO(result.value))
  },

  async update(
    actor: PlatformActor,
    id: string,
    dto: UpdateCareerJobDTO,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actor)
    if (!admin.ok) return admin

    const existing = await CareerJobRepository.findById(id)
    if (!existing.ok) return existing

    const result = await CareerJobRepository.update(id, dto)
    if (!result.ok) {
      auditMutation({
        entity: 'career_job',
        action: 'update',
        actorId: actor.id,
        targetId: id,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'career_job',
      action: 'update',
      actorId: actor.id,
      targetId: result.value.id,
    })

    return ok(toCareerJobDTO(result.value))
  },

  async changeStatus(
    actor: PlatformActor,
    id: string,
    dto: ChangeCareerJobStatusDTO,
  ): Promise<Result<CareerJobDTO>> {
    const admin = assertPlatformAdmin(actor)
    if (!admin.ok) return admin

    const existing = await CareerJobRepository.findById(id)
    if (!existing.ok) return existing

    const result = await CareerJobRepository.changeStatus(id, dto.status)
    if (!result.ok) {
      auditMutation({
        entity: 'career_job',
        action: 'update',
        actorId: actor.id,
        targetId: id,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'career_job',
      action: 'update',
      actorId: actor.id,
      targetId: result.value.id,
    })

    return ok(toCareerJobDTO(result.value))
  },
}
