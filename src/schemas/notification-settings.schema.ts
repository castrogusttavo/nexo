import z from 'zod'

export const UpdateNotificationSettingSchema = z
  .object({
    priorityChanges: z.boolean().optional(),
    stateChanges: z.boolean().optional(),
    comments: z.boolean().optional(),
    mentions: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nenhuma alterações informada')

export type UpdateNotificationSettingDTO = z.infer<
  typeof UpdateNotificationSettingSchema
>
