import type { IssueVote, IssueVoteType } from '@prisma/client'
import { issueVoteNotFound } from '../errors/app-error'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export interface IssueVoteTally {
  up: number
  down: number
}

export const IssueVoteRepository = {
  async findByIssueAndUser(
    issueId: string,
    userId: string,
  ): Promise<Result<IssueVote | null>> {
    try {
      const vote = await prisma.issueVote.findUnique({
        where: { issueId_userId: { issueId, userId } },
      })
      return ok(vote)
    } catch (error) {
      return err(dbError('Failed to find issue vote', error))
    }
  },

  async tallyByIssue(issueId: string): Promise<Result<IssueVoteTally>> {
    try {
      const grouped = await prisma.issueVote.groupBy({
        by: ['type'],
        where: { issueId },
        _count: { _all: true },
      })

      const tally = { up: 0, down: 0 }
      for (const row of grouped) {
        if (row.type === 'UP') tally.up = row._count._all
        if (row.type === 'DOWN') tally.down = row._count._all
      }

      return ok(tally)
    } catch (error) {
      return err(dbError('Failed to tally issue votes', error))
    }
  },

  async upsert(
    issueId: string,
    userId: string,
    type: IssueVoteType,
  ): Promise<Result<IssueVote>> {
    try {
      const vote = await prisma.issueVote.upsert({
        where: { issueId_userId: { issueId, userId } },
        create: { issueId, userId, type },
        update: { type },
      })
      return ok(vote)
    } catch (error) {
      return err(dbError('Failed to cast issue vote', error))
    }
  },

  async delete(issueId: string, userId: string): Promise<Result<void>> {
    try {
      const res = await prisma.issueVote.deleteMany({
        where: { issueId, userId },
      })
      if (res.count === 0) return err(issueVoteNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove issue vote', error))
    }
  },
}
