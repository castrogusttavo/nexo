import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIDEBAR_NAVIGATION,
  UpdateUserPreferenceSchema,
} from '@/src/schemas/user-preference.schema'

describe('UpdateUserPreferenceSchema', () => {
  it('should accept a full valid payload', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      theme: 'DARK',
      smoothCursor: true,
      quickSendShortcut: 'CTRL_ENTER',
      timezone: 'America/Sao_Paulo',
      weekStartsOn: 0,
      weekendDays: [5, 6],
    })

    expect(result.success).toBe(true)
  })

  it('should accept a partial payload', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ theme: 'LIGHT' })

    expect(result.success).toBe(true)
  })

  it('should reject an empty payload', () => {
    const result = UpdateUserPreferenceSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('should reject an unknown theme', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ theme: 'NEON' })

    expect(result.success).toBe(false)
  })

  it('should reject an unknown quick-send shortcut', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      quickSendShortcut: 'CTRL_END',
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid timezone', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      timezone: 'Not/AZone',
    })

    expect(result.success).toBe(false)
  })

  it('should accept a valid IANA timezone', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      timezone: 'Europe/Lisbon',
    })

    expect(result.success).toBe(true)
  })

  it('should reject weekStartsOn out of range', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekStartsOn: 7 })

    expect(result.success).toBe(false)
  })

  it('should reject a non-integer weekStartsOn', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekStartsOn: 1.5 })

    expect(result.success).toBe(false)
  })

  it('should reject weekendDays with an out-of-range day', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekendDays: [7] })

    expect(result.success).toBe(false)
  })

  it('should reject duplicate weekendDays', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekendDays: [6, 6] })

    expect(result.success).toBe(false)
  })

  it('should accept an empty weekendDays array', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekendDays: [] })

    expect(result.success).toBe(true)
  })
})

describe('UpdateUserPreferenceSchema navigation', () => {
  const parse = (navigation: unknown) =>
    UpdateUserPreferenceSchema.safeParse({ navigation })

  it('should accept the default navigation', () => {
    expect(parse(DEFAULT_SIDEBAR_NAVIGATION).success).toBe(true)
  })

  it('should cover every item of each section in the default', () => {
    expect(DEFAULT_SIDEBAR_NAVIGATION.personal.map((i) => i.id)).toEqual([
      'drafts',
      'your-work',
      'stickies',
    ])
    expect(DEFAULT_SIDEBAR_NAVIGATION.workspace.map((i) => i.id)).toEqual([
      'views',
      'cycles',
      'analytics',
      'archives',
      'dashboards',
    ])
    expect(DEFAULT_SIDEBAR_NAVIGATION.projectsLimit).toBeNull()
  })

  it('should accept a reordered section with hidden items and a limit', () => {
    const result = parse({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: [
        { id: 'stickies', visible: false },
        { id: 'drafts', visible: true },
        { id: 'your-work', visible: true },
      ],
      projectsLimit: 10,
    })

    expect(result.success).toBe(true)
  })

  it('should reject a section missing an item', () => {
    const result = parse({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: DEFAULT_SIDEBAR_NAVIGATION.personal.slice(1),
    })

    expect(result.success).toBe(false)
  })

  it('should reject a repeated item', () => {
    const result = parse({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: [
        { id: 'drafts', visible: true },
        { id: 'drafts', visible: false },
        { id: 'stickies', visible: true },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('should reject an item from the other section', () => {
    const result = parse({
      ...DEFAULT_SIDEBAR_NAVIGATION,
      personal: [
        { id: 'drafts', visible: true },
        { id: 'your-work', visible: true },
        { id: 'cycles', visible: true },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('should reject a navigation without projectsLimit', () => {
    const { projectsLimit: _omit, ...rest } = DEFAULT_SIDEBAR_NAVIGATION

    expect(parse(rest).success).toBe(false)
  })

  it.each([0, 51, 2.5])('should reject projectsLimit %s', (projectsLimit) => {
    expect(
      parse({ ...DEFAULT_SIDEBAR_NAVIGATION, projectsLimit }).success,
    ).toBe(false)
  })
})
