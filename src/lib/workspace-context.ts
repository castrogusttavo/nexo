import { cache } from 'react'
import { MembershipService } from '../services/membership.service'

export const getWorkspaceMembership = cache(
  (userId: string, workspaceSlug: string) =>
    MembershipService.getByUserAndSlug(userId, workspaceSlug),
)
