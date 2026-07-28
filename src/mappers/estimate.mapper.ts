import type { EstimateSettings, EstimateValue } from '@prisma/client'
import type { EstimateSettingsDTO, EstimateValueDTO } from '@/types/estimate'
import { withTimestamps } from './_shared'

export function toEstimateValueDTO(value: EstimateValue): EstimateValueDTO {
  return {
    id: value.id,
    value: value.value,
    order: value.order,
    estimateSettingsId: value.estimateSettingsId,
    ...withTimestamps(value),
  }
}

export function toEstimateSettingsDTO(
  settings: EstimateSettings,
  values: EstimateValue[],
): EstimateSettingsDTO {
  return {
    id: settings.id,
    system: settings.system,
    model: settings.model,
    projectId: settings.projectId,
    values: values.map(toEstimateValueDTO),
    ...withTimestamps(settings),
  }
}
