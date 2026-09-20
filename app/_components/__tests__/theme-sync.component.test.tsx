import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { ThemeSync } from '../theme-sync'

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }))
vi.mock('@/src/lib/auth-client', () => ({ authClient: { useSession } }))

function buildPreferences(
  theme: UserPreferenceDTO['theme'],
): UserPreferenceDTO {
  return {
    theme,
    smoothCursor: true,
    quickSendShortcut: 'ENTER',
    timezone: 'America/Sao_Paulo',
    weekStartsOn: 0,
    weekendDays: [0, 6],
  }
}

/** A `matchMedia` whose `change` listeners the test can fire by hand. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_event: string, handler: () => void) =>
      listeners.add(handler),
    ),
    removeEventListener: vi.fn((_event: string, handler: () => void) =>
      listeners.delete(handler),
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  window.matchMedia = vi.fn(() => media) as unknown as typeof window.matchMedia
  return {
    media,
    fireChange(next: boolean) {
      media.matches = next
      for (const handler of listeners) handler()
    },
  }
}

const isDark = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { id: 'user-1' } } })
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('<ThemeSync />', () => {
  it('renders nothing of its own', () => {
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('LIGHT')))
    const { container } = renderWithProviders(<ThemeSync />)

    expect(container).toBeEmptyDOMElement()
  })

  it('leaves the document alone while no session is signed in', async () => {
    useSession.mockReturnValue({ data: null })
    document.documentElement.classList.add('dark')
    const fetchSpy = mockFetch()
    renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled())
    expect(isDark()).toBe(true)
  })

  it('applies the stored dark theme', async () => {
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('DARK')))
    renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(isDark()).toBe(true))
  })

  it('applies the stored light theme over a dark document', async () => {
    document.documentElement.classList.add('dark')
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('LIGHT')))
    renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(isDark()).toBe(false))
  })

  it('follows the operating system when the theme is SYSTEM', async () => {
    const { media } = stubMatchMedia(true)
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('SYSTEM')))
    renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(isDark()).toBe(true))
    expect(media.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('re-applies SYSTEM when the operating system flips', async () => {
    const { fireChange } = stubMatchMedia(false)
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('SYSTEM')))
    renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(isDark()).toBe(false))

    fireChange(true)
    await waitFor(() => expect(isDark()).toBe(true))
  })

  it('stops following the operating system once unmounted', async () => {
    const { media } = stubMatchMedia(true)
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('SYSTEM')))
    const { unmount } = renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(isDark()).toBe(true))
    unmount()

    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })

  it('never subscribes to the operating system for a fixed theme', async () => {
    const { media } = stubMatchMedia(true)
    mockFetch().mockResolvedValue(apiSuccess(buildPreferences('LIGHT')))
    renderWithProviders(<ThemeSync />)

    await waitFor(() => expect(isDark()).toBe(false))
    expect(media.addEventListener).not.toHaveBeenCalled()
  })
})
