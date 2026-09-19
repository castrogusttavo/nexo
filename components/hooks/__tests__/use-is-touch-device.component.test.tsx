import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIsTouchDevice } from '../use-is-touch-device'

const ontouchstartDescriptor = Object.getOwnPropertyDescriptor(
  window,
  'ontouchstart',
)

function setMaxTouchPoints(value: number) {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => value,
  })
}

function setOntouchstart(present: boolean) {
  if (present) {
    Object.defineProperty(window, 'ontouchstart', {
      configurable: true,
      writable: true,
      value: null,
    })
  } else {
    Reflect.deleteProperty(window, 'ontouchstart')
  }
}

beforeEach(() => {
  // Start every test from a non-touch environment.
  setOntouchstart(false)
  setMaxTouchPoints(0)
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'maxTouchPoints')
  Reflect.deleteProperty(window, 'ontouchstart')
  if (ontouchstartDescriptor) {
    Object.defineProperty(window, 'ontouchstart', ontouchstartDescriptor)
  }
})

describe('useIsTouchDevice', () => {
  it('is false on a pointer-only device', () => {
    const { result } = renderHook(() => useIsTouchDevice())

    expect(result.current).toBe(false)
  })

  it('is true when the window supports touch events', () => {
    setOntouchstart(true)

    const { result } = renderHook(() => useIsTouchDevice())

    expect(result.current).toBe(true)
  })

  it('is true when the device reports touch points', () => {
    setMaxTouchPoints(5)

    const { result } = renderHook(() => useIsTouchDevice())

    expect(result.current).toBe(true)
  })

  it('re-evaluates on window resize', () => {
    const { result } = renderHook(() => useIsTouchDevice())
    expect(result.current).toBe(false)

    setMaxTouchPoints(1)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(true)
  })

  it('removes its resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useIsTouchDevice())

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
