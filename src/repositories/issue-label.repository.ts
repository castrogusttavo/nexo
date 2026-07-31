import type { IssueLabel, Label } from '@prisma/client'
import { issueLabelAlreadyExists, issueLabelNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type IssueLabelWithLabel = IssueLabel & { label: Label }

export const IssueLabelRepository = {
  async list(issueId: string): Promise<Result<IssueLabelWithLabel[]>> {
    try {
      const labels = await prisma.issueLabel.findMany({
        where: { issueId },
        include: { label: true },
        orderBy: { createdAt: 'asc' },
      })
      return ok(labels)
    } catch (error) {
      return err(dbError('Failed to list issue labels', error))
    }
  },

  async add(
    issueId: string,
    labelId: string,
  ): Promise<Result<IssueLabelWithLabel>> {
    try {
      const issueLabel = await prisma.issueLabel.create({
        data: { issueId, labelId },
        include: { label: true },
      })
      return ok(issueLabel)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(issueLabelAlreadyExists())
      }
      return err(dbError('Failed to add issue label', error))
    }
  },

  async remove(issueId: string, labelId: string): Promise<Result<void>> {
    try {
      const res = await prisma.issueLabel.deleteMany({
        where: { issueId, labelId },
      })
      if (res.count === 0) return err(issueLabelNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove issue label', error))
    }
  },
}
