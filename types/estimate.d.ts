export type EstimateSystemDTO = 'POINTS' | 'CATEGORIES' | 'TIME'

export type EstimateModelDTO =
  | 'FIBONACCI'
  | 'LINEAR'
  | 'SQUARES'
  | 'T_SHIRT_SIZES'
  | 'EASY_TO_HARD'
  | 'HOURS'

export interface EstimateValueDTO {
  id: string
  value: string
  order: number
  estimateSettingsId: string
  createdAt: string
  updatedAt: string
}

export interface EstimateSettingsDTO {
  id: string
  system: EstimateSystemDTO
  model: EstimateModelDTO
  projectId: string
  values: EstimateValueDTO[]
  createdAt: string
  updatedAt: string
}
