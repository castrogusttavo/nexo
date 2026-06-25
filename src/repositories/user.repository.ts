import type {
  Membership,
  OnboardingStep,
  User,
  UserGoal,
  UserRole,
  Workspace,
} from '@prisma/client'
import { conflict, databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

export type UserWithMemberships = User & {
  memberships: (Membership & { workspace: Workspace })[]
}

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

  async findByIdWithMemberships(
    id: string,
  ): Promise<Result<UserWithMemberships>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          memberships: {
            include: { workspace: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

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

  async findByUsername(username: string): Promise<Result<User | null>> {
    try {
      const user = await prisma.user.findUnique({ where: { username } })
      return ok(user)
    } catch {
      return err(databaseError('Failed to find user by username'))
    }
  },

  async create(data: {
    name: string
    email: string
    username: string
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
    data: {
      name?: string
      email?: string
      username?: string
      coverImage?: string
    },
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({ where: { id }, data })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('Username ou e-mail já está em uso'))
      }
      return err(databaseError('Failed to update user'))
    }
  },

  async updateOnboardingStep(
    id: string,
    step: OnboardingStep | null,
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { onboardingStep: step },
      })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(databaseError('Failed to update onboarding step'))
    }
  },

  async saveRole(
    id: string,
    role: UserRole,
    nextStep: OnboardingStep,
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { role, onboardingStep: nextStep },
      })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(databaseError('Failed to save user role'))
    }
  },

  async saveGaols(
    id: string,
    goals: UserGoal[],
    nextStep: OnboardingStep,
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { goals, onboardingStep: nextStep },
      })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(databaseError('Failed to save user goals'))
    }
  },

  async scheduleDeletion(id: string, scheduledAt: Date): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { deletionScheduledAt: scheduledAt },
      })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(databaseError('Failed to schedule user deletion'))
    }
  },

  async clearDeletionSchedule(id: string): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { deletionScheduledAt: null },
      })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(databaseError('Failed to clear deletion schedule'))
    }
  },

  async deleteHard(id: string): Promise<Result<true>> {
    try {
      await prisma.user.delete({ where: { id } })
      return ok(true)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(databaseError('Failed to delete user'))
    }
  },

  async countBlockingSoleOwnerWorkspaces(
    userId: string,
  ): Promise<Result<number>> {
    try {
      const count = await prisma.workspace.count({
        where: {
          memberships: { some: { userId, role: 'OWNER' } },
          AND: [
            { memberships: { some: { userId: { not: userId } } } },
            {
              memberships: {
                none: { userId: { not: userId }, role: 'OWNER' },
              },
            },
          ],
        },
      })
      return ok(count)
    } catch {
      return err(databaseError('Failed to count blocking workspaces'))
    }
  },
}
