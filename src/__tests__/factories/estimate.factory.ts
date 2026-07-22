import { createId } from '@paralleldrive/cuid2'
import type { EstimateSettings } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeEstimateSettings(
  overrides?: Partial<EstimateSettings>,
): EstimateSettings {
  const now = new Date()
  return {
    id: createId(),
    system: 'POINTS',
    model: 'FIBONACCI',
    projectId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedEstimateSettings(
  projectId: string,
  overrides?: Partial<Pick<EstimateSettings, 'system' | 'model'>>,
) {
  return prisma.estimateSettings.create({
    data: {
      projectId,
      ...overrides,
    },
  })
}
