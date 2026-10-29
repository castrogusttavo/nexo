import { describe, expect, it } from 'vitest'
import { createFakeUserPreference } from '@/src/__tests__/factories/user-preference.factory'
import {
  toHomeWidgets,
  toSidebarNavigation,
  toUserPreferenceDTO,
} from '@/src/mappers/user-preference.mapper'
import {
  DEFAULT_HOME_WIDGETS,
  DEFAULT_SIDEBAR_NAVIGATION,
} from '@/src/schemas/user-preference.schema'

describe('toSidebarNavigation', () => {
  it('should fall back to the default when nothing is stored', () => {
    expect(toSidebarNavigation(null)).toEqual(DEFAULT_SIDEBAR_NAVIGATION)
  })

  it('should fall back to the default when the stored value is not an object', () => {
    expect(toSidebarNavigation([1, 2])).toEqual(DEFAULT_SIDEBAR_NAVIGATION)
    expect(toSidebarNavigation('drafts')).toEqual(DEFAULT_SIDEBAR_NAVIGATION)
  })

  it('should keep the stored order, visibility and limit', () => {
    const result = toSidebarNavigation({
      personal: [
        { id: 'stickies', visible: false },
        { id: 'your-work', visible: true },
        { id: 'drafts', visible: true },
      ],
      workspace: [
        { id: 'dashboards', visible: true },
        { id: 'views', visible: false },
        { id: 'cycles', visible: true },
        { id: 'analytics', visible: true },
        { id: 'archives', visible: true },
      ],
      projectsLimit: 5,
    })

    expect(result).toEqual({
      personal: [
        { id: 'stickies', visible: false },
        { id: 'your-work', visible: true },
        { id: 'drafts', visible: true },
      ],
      workspace: [
        { id: 'dashboards', visible: true },
        { id: 'views', visible: false },
        { id: 'cycles', visible: true },
        { id: 'analytics', visible: true },
        { id: 'archives', visible: true },
      ],
      projectsLimit: 5,
    })
  })

  it('should append items missing from the stored section as visible', () => {
    const result = toSidebarNavigation({
      personal: [{ id: 'stickies', visible: false }],
    })

    expect(result.personal).toEqual([
      { id: 'stickies', visible: false },
      { id: 'drafts', visible: true },
      { id: 'your-work', visible: true },
    ])
  })

  it('should drop unknown, malformed and repeated items', () => {
    const result = toSidebarNavigation({
      personal: [
        { id: 'removed-feature', visible: true },
        { id: 'your-work' },
        'drafts',
        { id: 'drafts', visible: false },
        { id: 'drafts', visible: true },
      ],
    })

    expect(result.personal).toEqual([
      { id: 'drafts', visible: false },
      { id: 'your-work', visible: true },
      { id: 'stickies', visible: true },
    ])
  })

  it('should not take an item from the other section', () => {
    const result = toSidebarNavigation({
      personal: [{ id: 'cycles', visible: false }],
    })

    expect(result.personal.map((i) => i.id)).toEqual([
      'drafts',
      'your-work',
      'stickies',
    ])
  })

  it.each([
    0,
    51,
    2.5,
    '10',
    null,
  ])('should ignore projectsLimit %s', (projectsLimit) => {
    expect(toSidebarNavigation({ projectsLimit }).projectsLimit).toBeNull()
  })
})

describe('toUserPreferenceDTO', () => {
  it('should expose the normalized navigation', () => {
    const dto = toUserPreferenceDTO(
      createFakeUserPreference({
        navigation: { personal: [{ id: 'stickies', visible: false }] },
      }),
    )

    expect(dto.navigation.personal[0]).toEqual({
      id: 'stickies',
      visible: false,
    })
    expect(dto.navigation.workspace).toEqual(
      DEFAULT_SIDEBAR_NAVIGATION.workspace,
    )
  })

  it('should not leak the row id, userId or timestamps', () => {
    const dto = toUserPreferenceDTO(createFakeUserPreference())

    expect(dto).not.toHaveProperty('id')
    expect(dto).not.toHaveProperty('userId')
    expect(dto).not.toHaveProperty('createdAt')
  })
})

describe('toHomeWidgets', () => {
  it('falls back to every widget, visible, when nothing was stored', () => {
    expect(toHomeWidgets(null)).toEqual(DEFAULT_HOME_WIDGETS)
  })

  it('keeps the stored order and visibility', () => {
    const stored = [
      { id: 'stickies', visible: false },
      { id: 'recents', visible: true },
      { id: 'quick-links', visible: true },
    ]

    expect(toHomeWidgets(stored)).toEqual(stored)
  })

  it('drops unknown and repeated widgets and appends the missing ones', () => {
    expect(
      toHomeWidgets([
        { id: 'weather', visible: true },
        { id: 'stickies', visible: false },
        { id: 'stickies', visible: true },
      ]),
    ).toEqual([
      { id: 'stickies', visible: false },
      { id: 'quick-links', visible: true },
      { id: 'recents', visible: true },
    ])
  })

  it('reads a malformed value as the default', () => {
    expect(toHomeWidgets({ not: 'an array' })).toEqual(DEFAULT_HOME_WIDGETS)
  })
})
