import z from 'zod'

export const EstimateSystemSchema = z.enum(['POINTS', 'CATEGORIES', 'TIME'])

export const EstimateModelSchema = z.enum([
  'FIBONECCI',
  'LINEAR',
  'SQUARES',
  'T_SHIRT_SIZES',
  'EASY_TO_HARD',
  'HOURS',
])

const VALID_MODELS_BY_SYSTEM: Record<
  z.infer<typeof EstimateSystemSchema>,
  z.infer<typeof EstimateModelSchema>[]
> = {
  POINTS: ['FIBONECCI', 'LINEAR', 'SQUARES'],
  CATEGORIES: ['T_SHIRT_SIZES', 'EASY_TO_HARD'],
  TIME: ['HOURS'],
}

export const UpdateEstimateSettingsSchema = z
  .object({
    system: EstimateSystemSchema,
    model: EstimateModelSchema,
  })
  .refine((data) => VALID_MODELS_BY_SYSTEM[data.system].includes(data.model), {
    message: 'Modelo incompatível com o sistema escolhido',
    path: ['model'],
  })

export type UpdateEstimateSeettingsDTO = z.infer<
  typeof UpdateEstimateSettingsSchema
>
