import type { Label } from '@prisma/client'
import { labelNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const LabelRepository = {
  async findByid(id: string): Promise<Result<Label>> {
    try {
      const label = await prisma.label.findUnique({ where: { id } })
      if (!label) return err(labelNotFound())
      return ok(label)
    } catch (error) {
      return err(dbError('Failed to find label by id', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<Label[]>> {
    try {
      const labels = await prisma.label.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      })
      return ok(labels)
    } catch (error) {
      return err(dbError('Failed to list labels', error))
    }
  },

  async create(data: {
    name: string
    description?: string
    color?: Label['color']
    projectId: string
  }): Promise<Result<Label>> {
    try {
      const label = await prisma.label.create({ data })
      return ok(label)
    } catch (error) {
      return err(dbError('Failed to create label', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      color?: Label['color']
    },
  ): Promise<Result<Label>> {
    try {
      const label = await prisma.label.update({ where: { id }, data })
      return ok(label)
    } catch (error) {
      return err(dbError('Failed to update label', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.label.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete label', error))
    }
  },
}
