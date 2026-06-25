import z from 'zod'

export const ThemeValues = ['LIGHT', 'DARK', 'SYSTEM'] as const
export const QuickSendShortcutValues = ['ENTER', 'CTRL_ENTER'] as const

const weekdaySchema = z.number().int().min(0).max(6)

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const UpdateUserPreferenceSchema = z
  .object({
    theme: z.enum(ThemeValues).optional(),
    smoothCursor: z.boolean().optional(),
    quickSendShortcut: z.enum(QuickSendShortcutValues).optional(),
    timezone: z
      .string()
      .refine(isValidTimeZone, 'Fuso horário inválido')
      .optional(),
    weekStartsOn: weekdaySchema.optional(),
    weekendDays: z
      .array(weekdaySchema)
      .max(7)
      .refine(
        (days) => new Set(days).size === days.length,
        'Dias de fim de semana não podem se repetir',
      )
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nenhuma alteração informada')

export type UpdateUserPreferenceDTO = z.infer<typeof UpdateUserPreferenceSchema>
