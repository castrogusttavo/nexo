import type { EstimateSettings } from '@prisma/client'
import type { EstimateSettingsDTO } from '@/types/estimate'
import { withTimestamps } from './_shared'

export function toEstimateSettingsDTO(
  settings: EstimateSettings,
): EstimateSettingsDTO {
  return {
    id: settings.id,
    system: settings.system,
    model: settings.model,
    projectId: settings.projectId,
    ...withTimestamps(settings),
  }
}
