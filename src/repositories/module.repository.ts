import type { Module, ModuleMember, User } from '@prisma/client'
import {
  moduleMemberAlreadyExists,
  moduleMemberNotFound,
  moduleNotFound,
} from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type ModuleMemberWithUser = ModuleMember & {
  user: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const memberUserSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const ModuleRepository = {
  async findById(id: string): Promise<Result<Module>> {
    try {
      const module = await prisma.module.findUnique({ where: { id } })
      if (!module) return err(moduleNotFound())
      return ok(module)
    } catch (error) {
      return err(dbError('Failed to find module by id', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<Module[]>> {
    try {
      const modules = await prisma.module.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      })
      return ok(modules)
    } catch (error) {
      return err(dbError('Failed to list modules', error))
    }
  },

  async listMembers(moduleId: string): Promise<Result<ModuleMemberWithUser[]>> {
    try {
      const members = await prisma.moduleMember.findMany({
        where: { moduleId },
        include: { user: memberUserSelect },
        orderBy: { createdAt: 'asc' },
      })
      return ok(members)
    } catch (error) {
      return err(dbError('Failed to list module members', error))
    }
  },

  async addMember(
    userId: string,
    moduleId: string,
  ): Promise<Result<ModuleMemberWithUser>> {
    try {
      const member = await prisma.moduleMember.create({
        data: { userId, moduleId },
        include: { user: memberUserSelect },
      })
      return ok(member)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(moduleMemberAlreadyExists())
      }
      return err(dbError('Failed to add module member', error))
    }
  },

  async removeMember(userId: string, moduleId: string): Promise<Result<void>> {
    try {
      const res = await prisma.moduleMember.deleteMany({
        where: { userId, moduleId },
      })
      if (res.count === 0) return err(moduleMemberNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove module member', error))
    }
  },

  async create(data: {
    name: string
    status?: Module['status']
    startDate?: Date
    endDate?: Date
    leadId: string
    projectId: string
  }): Promise<Result<Module>> {
    try {
      const module = await prisma.$transaction(async (tx) => {
        const m = await tx.module.create({ data })
        await tx.moduleMember.create({
          data: { userId: data.leadId, moduleId: m.id },
        })
        return m
      })
      return ok(module)
    } catch (error) {
      return err(dbError('Failed to create module', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      status?: Module['status']
      startDate?: Date | null
      endDate?: Date | null
      progress?: number
    },
  ): Promise<Result<Module>> {
    try {
      const module = await prisma.module.update({ where: { id }, data })
      return ok(module)
    } catch (error) {
      return err(dbError('Failed to update module', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.module.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete module', error))
    }
  },

  async addFavorite(userId: string, moduleId: string): Promise<Result<void>> {
    try {
      await prisma.moduleFavorite.upsert({
        where: { userId_moduleId: { userId, moduleId } },
        create: { userId, moduleId },
        update: {},
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to add favorite', error))
    }
  },

  async removeFavorite(
    userId: string,
    moduleId: string,
  ): Promise<Result<void>> {
    try {
      await prisma.moduleFavorite.deleteMany({ where: { userId, moduleId } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove favorite', error))
    }
  },
}
