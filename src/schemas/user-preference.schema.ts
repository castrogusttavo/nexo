import z from 'zod'

export const ThemeValues = ['LIGHT', 'DARK', 'SYSTEM'] as const
export const QuickSendShortcutValues = ['ENTER', 'CTRL_ENTER'] as const
export const PersonalNavItemValues = [
  'drafts',
  'your-work',
  'stickies',
] as const
export const WorkspaceNavItemValues = [
  'views',
  'cycles',
  'analytics',
  'archives',
  'dashboards',
] as const
export const PROJECTS_LIMIT_MAX = 50
export const DEFAULT_PROJECTS_LIMIT = 10

export type PersonalNavItem = (typeof PersonalNavItemValues)[number]
export type WorkspaceNavItem = (typeof WorkspaceNavItemValues)[number]

// The client always sends the whole section: exactly one entry per item, so
// a payload can reorder or hide an item but never drop one.
function navSection<const T extends readonly [string, ...string[]]>(ids: T) {
  return z
    .array(z.object({ id: z.enum(ids), visible: z.boolean() }))
    .length(ids.length, 'Todos os itens da seção devem ser informados')
    .refine(
      (items) => new Set(items.map((i) => i.id)).size === items.length,
      'Itens da navegação não podem se repetir',
    )
}

const weekdaySchema = z.number().int().min(0).max(6)

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const SidebarNavigationSchema = z.object({
  personal: navSection(PersonalNavItemValues),
  workspace: navSection(WorkspaceNavItemValues),
  projectsLimit: z.number().int().min(1).max(PROJECTS_LIMIT_MAX).nullable(),
})

export type SidebarNavigation = z.infer<typeof SidebarNavigationSchema>

export const DEFAULT_SIDEBAR_NAVIGATION: SidebarNavigation = {
  personal: PersonalNavItemValues.map((id) => ({ id, visible: true })),
  workspace: WorkspaceNavItemValues.map((id) => ({ id, visible: true })),
  projectsLimit: null,
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
    navigation: SidebarNavigationSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nenhuma alteração informada')

export type UpdateUserPreferenceDTO = z.infer<typeof UpdateUserPreferenceSchema>
