import type { Module } from '@prisma/client'
import type { ModuleDTO, ModuleMemberDTO } from '@/types/module'
import type { ModuleMemberWithUser } from '../repositories/module.repository'
import { withTimestamps } from './_shared'

export function toModuleDTO(module: Module, isFavorited = false): ModuleDTO {
  return {
    id: module.id,
    name: module.name,
    progress: module.progress,
    status: module.status,
    startDate: module.startDate?.toISOString() ?? null,
    endDate: module.endDate?.toISOString() ?? null,
    isFavorited,
    leadId: module.leadId,
    projectId: module.projectId,
    ...withTimestamps(module),
  }
}

export function toModuleMemberDTO(
  member: ModuleMemberWithUser,
  leadId: string,
): ModuleMemberDTO {
  return {
    userId: member.userId,
    name: member.user.name,
    username: member.user.username,
    image: member.user.image ?? null,
    isLead: member.userId === leadId,
    createdAt: member.createdAt.toISOString(),
  }
}
