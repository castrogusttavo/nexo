import type { Cycle } from '@prisma/client'
import type { CycleDTO, CycleMemberDTO } from '@/types/cycle'
import type { CycleMemberWithUser } from '../repositories/cycle.repository'
import { withTimestamps } from './_shared'

export function toCycleDTO(cycle: Cycle): CycleDTO {
  return {
    id: cycle.id,
    name: cycle.name,
    description: cycle.description ?? null,
    status: cycle.status,
    startDate: cycle.startDate?.toISOString() ?? null,
    endDate: cycle.endDate?.toISOString() ?? null,
    leadId: cycle.leadId,
    projectId: cycle.projectId,
    ...withTimestamps(cycle),
  }
}

export function toCycleMemberDTO(
  member: CycleMemberWithUser,
  leadId: string,
): CycleMemberDTO {
  return {
    userId: member.userId,
    name: member.user.name,
    username: member.user.name,
    image: member.user.image ?? null,
    isLead: member.userId === leadId,
    createdAt: member.createdAt.toISOString(),
  }
}
