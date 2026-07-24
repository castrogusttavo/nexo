import type { Cycle, CycleMember, User } from '@prisma/client'
import {
  cycleMemberAlreadyExists,
  cycleMemberNotFound,
  cycleNotFound,
} from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type CycleMemberWithUser = CycleMember & {
  user: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const memberUserSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const CycleRepository = {
  async findById(id: string): Promise<Result<Cycle>> {
    try {
      const cycle = await prisma.cycle.findUnique({ where: { id } })
      if (!cycle) return err(cycleNotFound())
      return ok(cycle)
    } catch (error) {
      return err(dbError('Failed to find cycle by id', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<Cycle[]>> {
    try {
      const cycles = await prisma.cycle.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      })
      return ok(cycles)
    } catch (error) {
      return err(dbError('Failed to list cycle', error))
    }
  },

  async findActiveByProject(projectId: string): Promise<Result<Cycle | null>> {
    try {
      const cycle = await prisma.cycle.findFirst({
        where: { projectId, status: 'IN_PROGRESS' },
      })
      return ok(cycle)
    } catch (error) {
      return err(dbError('Failed to find active cycle', error))
    }
  },

  async listmembers(cycleId: string): Promise<Result<CycleMemberWithUser[]>> {
    try {
      const members = await prisma.cycleMember.findMany({
        where: { cycleId },
        include: { user: memberUserSelect },
        orderBy: { createdAt: 'asc' },
      })
      return ok(members)
    } catch (error) {
      return err(dbError('Failed to list cycle members', error))
    }
  },

  async addMember(
    userId: string,
    cycleId: string,
  ): Promise<Result<CycleMemberWithUser>> {
    try {
      const member = await prisma.cycleMember.create({
        data: { userId, cycleId },
        include: { user: memberUserSelect },
      })
      return ok(member)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(cycleMemberAlreadyExists())
      }
      return err(dbError('Failed to add cycle members', error))
    }
  },

  async removeMember(userId: string, cycleId: string): Promise<Result<void>> {
    try {
      const res = await prisma.cycleMember.deleteMany({
        where: { userId, cycleId },
      })
      if (res.count === 0) return err(cycleMemberNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove cycle members', error))
    }
  },

  async create(data: {
    name: string
    description?: string
    status?: Cycle['status']
    startDate?: Date
    endDate?: Date
    leadId: string
    projectId: string
  }): Promise<Result<Cycle>> {
    try {
      const cycle = await prisma.$transaction(async (tx) => {
        const c = await tx.cycle.create({ data })
        await tx.cycleMember.create({
          data: { userId: data.leadId, cycleId: c.id },
        })
        return c
      })
      return ok(cycle)
    } catch (error) {
      return err(dbError('Failed to create cycle', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      status?: Cycle['status']
      startDate?: Date
      endDate?: Date
    },
  ): Promise<Result<Cycle>> {
    try {
      const cycle = await prisma.cycle.update({ where: { id }, data })
      return ok(cycle)
    } catch (error) {
      return err(dbError('Failed to update cycle', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.cycle.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete cycle', error))
    }
  },
}
