import type { Result } from '../lib/result'
import {
  MembershipRepository,
  type MembershipWithWorkspace,
} from '../repositories/membership.repository'

export const MembershipService = {
  async getByUserAndSlug(
    userId: string,
    slug: string,
  ): Promise<Result<MembershipWithWorkspace | null>> {
    return MembershipRepository.findByUserAndSlug(userId, slug)
  },

  async listByUser(userId: string): Promise<Result<MembershipWithWorkspace[]>> {
    return MembershipRepository.listByUser(userId)
  },

  async countByWorkspace(workspaceId: string): Promise<Result<number>> {
    return MembershipRepository.countByWorkspace(workspaceId)
  },
}
