import type {
  Membership,
  OnboardingStep,
  User,
  UserGoal,
  UserRole,
  Workspace,
} from '@prisma/client'
import { conflict, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

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
    } catch (error) {
      return err(dbError('Failed to find user by id', error))
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
    } catch (error) {
      return err(dbError('Failed to find user by id', error))
    }
  },

  async findByEmail(email: string): Promise<Result<User | null>> {
    try {
      const user = await prisma.user.findUnique({ where: { email } })
      return ok(user)
    } catch (error) {
      return err(dbError('Failed to find user by email', error))
    }
  },

  async findByUsername(username: string): Promise<Result<User | null>> {
    try {
      const user = await prisma.user.findUnique({ where: { username } })
      return ok(user)
    } catch (error) {
      return err(dbError('Failed to find user by username', error))
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
      return err(dbError('Failed to create user', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      email?: string
      username?: string
      image?: string
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
      return err(dbError('Failed to update user', error))
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
      return err(dbError('Failed to update onboarding step', error))
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
      return err(dbError('Failed to save user role', error))
    }
  },

  async saveGoals(
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
      return err(dbError('Failed to save user goals', error))
    }
  },

  async saveProfile(
    id: string,
    name: string,
    nextStep: OnboardingStep,
  ): Promise<Result<User>> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { name, onboardingStep: nextStep },
      })
      return ok(user)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(notFound('User'))
      }
      return err(dbError('Failed to save user profile', error))
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
      return err(dbError('Failed to schedule user deletion', error))
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
      return err(dbError('Failed to clear deletion schedule', error))
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
      return err(dbError('Failed to delete user', error))
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
    } catch (error) {
      return err(dbError('Failed to count blocking workspaces', error))
    }
  },

  async hasCredentialAccount(userId: string): Promise<Result<boolean>> {
    try {
      const account = await prisma.account.findFirst({
        where: { userId, providerId: 'credential' },
        select: { password: true },
      })
      return ok(!!account?.password)
    } catch (error) {
      return err(dbError('Failed to check credential account, error', error))
    }
  },

  async acceptConsents(
    id: string,
    consent: {
      termsVersion: string
      privacyVersion: string
      ipAddress: string | null
      userAgent: string | null
      at: Date
    },
  ): Promise<Result<void>> {
    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: {
            acceptedTermsAt: consent.at,
            acceptedPrivacyAt: consent.at,
          },
        }),
        prisma.consentEvent.createMany({
          data: [
            {
              userId: id,
              document: 'TERMS',
              version: consent.termsVersion,
              action: 'GRANTED',
              ipAddress: consent.ipAddress,
              userAgent: consent.userAgent,
            },
            {
              userId: id,
              document: 'PRIVACY',
              version: consent.privacyVersion,
              action: 'GRANTED',
              ipAddress: consent.ipAddress,
              userAgent: consent.userAgent,
            },
          ],
        }),
      ])
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to persist consent', error))
    }
  },
}
