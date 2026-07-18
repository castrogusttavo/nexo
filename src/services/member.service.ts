import type { Role } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { ListMembersResult, MemberDTO } from '@/types/member'
import type { MemberImportResult } from '@/types/member-import'
import { featureNotInPlan } from '../errors'
import { can } from '../lib/plans'
import { err, ok, type Result } from '../lib/result'
import { toMemberDTO } from '../mappers/member.mapper'
import { MembershipRepository } from '../repositories/membership.repository'
import { WorkspaceRepository } from '../repositories/workspace.repository'
import type { ListMembersQuery } from '../schemas/member.schema'
import type { MemberImportRowDTO } from '../schemas/member-import.schema'
import { assertPrivileged } from './_authz'
import { InvitationService } from './invitation.service'

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

function compareMembers(
  a: MemberDTO,
  b: MemberDTO,
  sortBy: ListMembersQuery['sortBy'],
): number {
  if (sortBy === 'role') return ROLE_RANK[a.role] - ROLE_RANK[b.role]
  if (sortBy === 'joinedAt') {
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  }
  return a[sortBy].localeCompare(b[sortBy], 'pt-BR', { sensitivity: 'base' })
}

export const MemberService = {
  async list(
    actorId: string,
    workspaceId: string,
    query: ListMembersQuery,
  ): Promise<Result<ListMembersResult>> {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    const result = await MembershipRepository.listByWorkspaceWithUser(
      workspaceId,
      {
        search: query.search,
        roles: query.roles as Role[] | undefined,
      },
    )
    if (!result.ok) return result

    const direction = query.sortOrder === 'asc' ? 1 : -1
    const members = result.value
      .map(toMemberDTO)
      .sort((a, b) => compareMembers(a, b, query.sortBy) * direction)

    const total = members.length
    const start = (query.page - 1) * query.pageSize
    const page = members.slice(start, start + query.pageSize)

    return ok({
      members: page,
      total,
      page: query.page,
      pageSize: query.pageSize,
    })
  },

  async import(
    actorId: string,
    workspaceId: string,
    rows: MemberImportRowDTO[],
  ): Promise<Result<MemberImportResult>> {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    const workspace = await WorkspaceRepository.findById(workspaceId)
    if (!workspace.ok) return workspace
    if (!can(workspace.value.activePlan, 'importMembersCsv')) {
      return err(
        featureNotInPlan(
          'Importação de membros via CSV disponível a partir do plano Pro',
        ),
      )
    }

    const rowsResult = []
    for (const [index, row] of rows.entries()) {
      const invited = await InvitationService.create(actorId, workspaceId, {
        email: row.email,
        role: row.role,
      })

      if (invited.ok) {
        rowsResult.push({
          row: index + 1,
          email: row.email,
          status: 'invited' as const,
        })
      } else if (
        invited.error.code === 'INVITATION_DUPLICATE' ||
        invited.error.code === 'INVITATION_ALREADY_MEMBER'
      ) {
        rowsResult.push({
          row: index + 1,
          email: row.email,
          status: 'skipped' as const,
          reason: invited.error.message,
        })
      } else {
        rowsResult.push({
          row: index + 1,
          email: row.email,
          status: 'error' as const,
          reason: invited.error.message,
        })
      }
    }

    auditMutation({
      entity: 'invitation',
      action: 'create',
      actorId,
      targetId: workspaceId,
      reason: 'csv_import',
      meta: {
        total: rows.length,
        invited: rowsResult.filter((r) => r.status === 'invited').length,
      },
    })

    return ok({
      invited: rowsResult.filter((r) => r.status === 'invited').length,
      skipped: rowsResult.filter((r) => r.status === 'skipped').length,
      errors: rowsResult.filter((r) => r.status === 'error').length,
      rows: rowsResult,
    })
  },
}
