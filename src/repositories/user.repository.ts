import type { Role, User } from '@prisma/client'
import { conflict, databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

export const UserRepository = {
  async findById(id: string): Promise<Result<User>> {
    try {
      const user = await prisma.user.findUnique({ where: { id } })

      if (!user) {
        return err(notFound('User'))
      }

      return ok(user)
    } catch {
      return err(databaseError('Failed to find user by id'))
    }
  },

  async findByEmail(email: string): Promise<Result<User | null>> {
    try {
      const user = await prisma.user.findUnique({ where: { email } })
      return ok(user)
    } catch {
      return err(databaseError('Failed to find user by email'))
    }
  },

  async create(data: {
    name: string
    email: string
    role?: Role
    workspaceId?: string
  }): Promise<Result<User>> {
    try {
      const user = await prisma.user.create({ data })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('E-mail já está em uso'))
      }
      return err(databaseError('Failed to create user'))
    }
  },

  async update(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({ where: { id }, data })
      return ok(user)
    } catch {
      return err(databaseError('Failed to update user'))
    }
  },
}
