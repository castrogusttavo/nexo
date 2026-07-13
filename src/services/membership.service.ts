import type { Result } from '../lib/result'
import { ok } from '../lib/result'
import type { MembershipDTO } from '../mappers/membership.mapper'
import { toMembershipDTO } from '../mappers/membership.mapper'
import { MembershipRepository } from '../repositories/membership.repository'

export const MembershipService = {
  async getByUserAndSlug(
    userId: string,
    slug: string,
  ): Promise<Result<MembershipDTO | null>> {
    const result = await MembershipRepository.findByUserAndSlug(userId, slug)
    if (!result.ok) return result

    return ok(result.value ? toMembershipDTO(result.value) : null)
  },

  async listByUser(userId: string): Promise<Result<MembershipDTO[]>> {
    const result = await MembershipRepository.listByUser(userId)
    if (!result.ok) return result

    return ok(result.value.map(toMembershipDTO))
  },

  async countByWorkspace(workspaceId: string): Promise<Result<number>> {
    return MembershipRepository.countByWorkspace(workspaceId)
  },
}
