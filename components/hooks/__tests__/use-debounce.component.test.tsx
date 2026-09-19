import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from '../use-debounce'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderDebounce(initial: string, delay?: number) {
  return renderHook(({ value, delay }) => useDebounce(value, delay), {
    initialProps: { value: initial, delay },
  })
}

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderDebounce('a')

    expect(result.current).toBe('a')
  })

  it('only publishes a new value after the default 500ms delay', () => {
    const { result, rerender } = renderDebounce('a')

    rerender({ value: 'b', delay: undefined })
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('b')
  })

  it('honours a custom delay', () => {
    const { result, rerender } = renderDebounce('a', 100)

    rerender({ value: 'b', delay: 100 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe('b')
  })

  it('restarts the timer on every change and keeps only the last value', () => {
    const { result, rerender } = renderDebounce('a', 300)

    rerender({ value: 'b', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 'c', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('c')
  })

  it('clears the pending timer on unmount', () => {
    const { rerender, unmount } = renderDebounce('a', 300)

    rerender({ value: 'b', delay: 300 })
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
