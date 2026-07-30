import type { IssueAssignee, IssueSubscriber, User } from '@prisma/client'
import {
  issueAssigneeAlreadyExists,
  issueAssigneeNotFound,
  issueSubscriberNotFound,
} from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type IssueAssigneeWithUser = IssueAssignee & {
  user: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const assigneeUserSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const IssueAssigneeRepository = {
  async list(issueId: string): Promise<Result<IssueAssigneeWithUser[]>> {
    try {
      const assignees = await prisma.issueAssignee.findMany({
        where: { issueId },
        include: { user: assigneeUserSelect },
        orderBy: { createdAt: 'asc' },
      })
      return ok(assignees)
    } catch (error) {
      return err(dbError('Failed to list issue assignees', error))
    }
  },

  async assign(
    issueId: string,
    userId: string,
  ): Promise<Result<IssueAssigneeWithUser>> {
    try {
      const assignee = await prisma.issueAssignee.create({
        data: { issueId, userId },
        include: { user: assigneeUserSelect },
      })
      return ok(assignee)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(issueAssigneeAlreadyExists())
      }
      return err(dbError('Failed to assign issue', error))
    }
  },

  async unassign(issueId: string, userId: string): Promise<Result<void>> {
    try {
      const res = await prisma.issueAssignee.deleteMany({
        where: { issueId, userId },
      })
      if (res.count === 0) return err(issueAssigneeNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to unassign issue', error))
    }
  },
}

export const IssueSubscriberRepository = {
  async list(issueId: string): Promise<Result<IssueSubscriber[]>> {
    try {
      const subscribers = await prisma.issueSubscriber.findMany({
        where: { issueId },
        orderBy: { createdAt: 'asc' },
      })
      return ok(subscribers)
    } catch (error) {
      return err(dbError('Failed to list issue subscribers', error))
    }
  },

  async subscribe(
    issueId: string,
    userId: string,
  ): Promise<Result<IssueSubscriber>> {
    try {
      const subscriber = await prisma.issueSubscriber.upsert({
        where: { issueId_userId: { issueId, userId } },
        create: { issueId, userId },
        update: {},
      })
      return ok(subscriber)
    } catch (error) {
      return err(dbError('Failed to subscribe to issue', error))
    }
  },

  async unsubscribe(issueId: string, userId: string): Promise<Result<void>> {
    try {
      const res = await prisma.issueSubscriber.deleteMany({
        where: { issueId, userId },
      })
      if (res.count === 0) return err(issueSubscriberNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to unsubscribe from issue', error))
    }
  },
}
