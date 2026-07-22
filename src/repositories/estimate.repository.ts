import type { EstimateSettings } from '@prisma/client'
import { estimateSettingsNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const EstimateRepository = {
  async findByProjectId(projectId: string): Promise<Result<EstimateSettings>> {
    try {
      const settings = await prisma.estimateSettings.findUnique({
        where: { projectId },
      })
      if (!settings) return err(estimateSettingsNotFound())
      return ok(settings)
    } catch (error) {
      return err(dbError('Failed to find estimate settings', error))
    }
  },

  async update(
    projectId: string,
    data: {
      system: EstimateSettings['system']
      model: EstimateSettings['model']
    },
  ): Promise<Result<EstimateSettings>> {
    try {
      const settings = await prisma.estimateSettings.update({
        where: { projectId },
        data,
      })
      return ok(settings)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(estimateSettingsNotFound())
      }
      return err(dbError('Failed to update estimate settings', error))
    }
  },
}
