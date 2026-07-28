import z from 'zod'

export const EstimateSystemSchema = z.enum(['POINTS', 'CATEGORIES', 'TIME'])

export const EstimateModelSchema = z.enum([
  'FIBONACCI',
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
  POINTS: ['FIBONACCI', 'LINEAR', 'SQUARES'],
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

export type UpdateEstimateSettingsDTO = z.infer<
  typeof UpdateEstimateSettingsSchema
>

const estimateValueLabel = z
  .string()
  .min(1, 'Valor deve ter ao menos 1 caractere')
  .max(20, 'Valor deve ter no máximo 20 caracteres')

export const CreateEstimateValueSchema = z.object({
  value: estimateValueLabel,
})

export type CreateEstimateValueDTO = z.infer<typeof CreateEstimateValueSchema>

export const UpdateEstimateValueSchema = z.object({
  value: estimateValueLabel,
})

export type UpdateEstimateValueDTO = z.infer<typeof UpdateEstimateValueSchema>

export const ReorderEstimateValuesSchema = z.object({
  valueIds: z.array(z.string()).min(1),
})

export type ReorderEstimateValuesDTO = z.infer<
  typeof ReorderEstimateValuesSchema
>
