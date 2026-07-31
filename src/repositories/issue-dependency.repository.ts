import type { IssueDependency, IssueDependencyType } from '@prisma/client'
import {
  issueDependencyAlreadyExists,
  issueDependencyNotFound,
} from '../errors/app-error'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const IssueDependencyRepository = {
  async findById(id: string): Promise<Result<IssueDependency>> {
    try {
      const dependency = await prisma.issueDependency.findUnique({
        where: { id },
      })
      if (!dependency) return err(issueDependencyNotFound())
      return ok(dependency)
    } catch (error) {
      return err(dbError('Failed to find issue dependency by id', error))
    }
  },

  async listByIssue(issueId: string): Promise<Result<IssueDependency[]>> {
    try {
      const dependencies = await prisma.issueDependency.findMany({
        where: { OR: [{ sourceId: issueId }, { targetId: issueId }] },
        orderBy: { createdAt: 'asc' },
      })
      return ok(dependencies)
    } catch (error) {
      return err(dbError('Failed to find issue dependencies', error))
    }
  },

  async listOutgoing(
    sourceId: string,
    type: IssueDependencyType,
  ): Promise<Result<IssueDependency[]>> {
    try {
      const dependencies = await prisma.issueDependency.findMany({
        where: { sourceId, type },
      })
      return ok(dependencies)
    } catch (error) {
      return err(dbError('Failed to find outgoing dependencies', error))
    }
  },

  async create(
    sourceId: string,
    targetId: string,
    type: IssueDependencyType,
  ): Promise<Result<IssueDependency>> {
    try {
      const dependency = await prisma.issueDependency.create({
        data: { sourceId, targetId, type },
      })
      return ok(dependency)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(issueDependencyAlreadyExists())
      }
      return err(dbError('Failed to create issue dependency', error))
    }
  },

  async remove(id: string): Promise<Result<void>> {
    try {
      await prisma.issueDependency.delete({
        where: { id },
      })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueDependencyNotFound())
      }
      return err(dbError('Failed to remove issue dependency', error))
    }
  },
}
