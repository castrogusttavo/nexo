import type { EstimateValue } from '@prisma/client'
import { estimateValueNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const DEFAULT_ESTIMATE_VALUES = [
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  '34',
  '55',
]

export const EstimateValueRepository = {
  async findById(id: string): Promise<Result<EstimateValue>> {
    try {
      const value = await prisma.estimateValue.findUnique({ where: { id } })
      if (!value) return err(estimateValueNotFound())
      return ok(value)
    } catch (error) {
      return err(dbError('Failed to find estimate value by id', error))
    }
  },

  async listByEstimateSettingsId(
    estimateSettingsId: string,
  ): Promise<Result<EstimateValue[]>> {
    try {
      const values = await prisma.estimateValue.findMany({
        where: { estimateSettingsId },
        orderBy: { order: 'asc' },
      })
      return ok(values)
    } catch (error) {
      return err(dbError('Failed to list estimate values', error))
    }
  },

  async countByEstimateSettingsId(
    estimateSettingsId: string,
  ): Promise<Result<number>> {
    try {
      const count = await prisma.estimateValue.count({
        where: { estimateSettingsId },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to count estimate values', error))
    }
  },

  async create(
    estimateSettingsId: string,
    value: string,
  ): Promise<Result<EstimateValue>> {
    try {
      const count = await prisma.estimateValue.count({
        where: { estimateSettingsId },
      })
      const created = await prisma.estimateValue.create({
        data: { estimateSettingsId, value, order: count },
      })
      return ok(created)
    } catch (error) {
      return err(dbError('Failed to create estimate value', error))
    }
  },

  async update(id: string, value: string): Promise<Result<EstimateValue>> {
    try {
      const updated = await prisma.estimateValue.update({
        where: { id },
        data: { value },
      })
      return ok(updated)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(estimateValueNotFound())
      }
      return err(dbError('Failed to update estimate value', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.estimateValue.delete({
        where: { id },
      })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(estimateValueNotFound())
      }
      return err(dbError('Failed to delete estimate value', error))
    }
  },

  async reorder(
    estimateSettingsId: string,
    valueIds: string[],
  ): Promise<Result<EstimateValue[]>> {
    try {
      await prisma.$transaction(
        valueIds.map((id, index) =>
          prisma.estimateValue.update({
            where: { id },
            data: { order: index },
          }),
        ),
      )
      const values = await prisma.estimateValue.findMany({
        where: { estimateSettingsId },
        orderBy: { order: 'asc' },
      })
      return ok(values)
    } catch (error) {
      return err(dbError('Failed to reorder estimate values', error))
    }
  },
}
