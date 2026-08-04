import type { IssueRelation, IssueRelationType } from '@prisma/client'
import { issueRelationAlreadyExists, issueRelationNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const IssueRelationRepository = {
  async findById(id: string): Promise<Result<IssueRelation>> {
    try {
      const relation = await prisma.issueRelation.findUnique({
        where: { id },
      })
      if (!relation) return err(issueRelationNotFound())
      return ok(relation)
    } catch (error) {
      return err(dbError('Failed to find issue relation by id', error))
    }
  },

  async listByIssue(issueId: string): Promise<Result<IssueRelation[]>> {
    try {
      const relations = await prisma.issueRelation.findMany({
        where: { OR: [{ sourceId: issueId }, { targetId: issueId }] },
        orderBy: { createdAt: 'asc' },
      })
      return ok(relations)
    } catch (error) {
      return err(dbError('Failed to list issue relations', error))
    }
  },

  async findBetween(
    issueA: string,
    issueB: string,
    type: IssueRelationType,
  ): Promise<Result<IssueRelation | null>> {
    try {
      const relation = await prisma.issueRelation.findFirst({
        where: {
          type,
          OR: [
            { sourceId: issueA, targetId: issueB },
            { sourceId: issueB, targetId: issueA },
          ],
        },
      })
      return ok(relation)
    } catch (error) {
      return err(dbError('Failed to find relation between issues', error))
    }
  },

  async create(
    sourceId: string,
    targetId: string,
    type: IssueRelationType,
  ): Promise<Result<IssueRelation>> {
    try {
      const relation = await prisma.issueRelation.create({
        data: { sourceId, targetId, type },
      })
      return ok(relation)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(issueRelationAlreadyExists())
      }
      return err(dbError('Failed to create issue relation', error))
    }
  },

  async remove(id: string): Promise<Result<void>> {
    try {
      await prisma.issueRelation.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueRelationNotFound())
      }
      return err(dbError('Failed to remove issue relation', error))
    }
  },
}
