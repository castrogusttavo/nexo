import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsMobile } from '../use-mobile'

const originalInnerWidth = window.innerWidth

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

// A controllable MediaQueryList: captures the `change` listener so a test
// can fire it after resizing the window.
function stubMatchMedia() {
  const listeners = new Set<() => void>()
  const mql = {
    matches: false,
    media: '',
    onchange: null,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) =>
      listeners.delete(cb),
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  vi.mocked(window.matchMedia).mockReturnValue(
    mql as unknown as MediaQueryList,
  )
  return {
    mql,
    listeners,
    fireChange: () => {
      for (const cb of listeners) cb()
    },
  }
}

afterEach(() => {
  setInnerWidth(originalInnerWidth)
})

describe('useIsMobile', () => {
  it('is true below the 768px breakpoint', () => {
    stubMatchMedia()
    setInnerWidth(767)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('is false at and above the 768px breakpoint', () => {
    stubMatchMedia()
    setInnerWidth(768)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('subscribes to the max-width media query', () => {
    stubMatchMedia()

    renderHook(() => useIsMobile())

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
  })

  it('updates when the media query changes', () => {
    const { fireChange } = stubMatchMedia()
    setInnerWidth(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    setInnerWidth(500)
    act(() => fireChange())
    expect(result.current).toBe(true)

    setInnerWidth(900)
    act(() => fireChange())
    expect(result.current).toBe(false)
  })

  it('removes its change listener on unmount', () => {
    const { mql, listeners } = stubMatchMedia()

    const { unmount } = renderHook(() => useIsMobile())
    expect(listeners.size).toBe(1)
    const [listener] = listeners

    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', listener)
    expect(listeners.size).toBe(0)
  })
})
