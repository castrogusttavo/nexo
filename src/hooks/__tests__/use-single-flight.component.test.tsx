import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSingleFlight } from '../use-single-flight'

function deferred() {
  let resolve: () => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useSingleFlight', () => {
  it('drops a call made while the previous one is running', async () => {
    const { result } = renderHook(() => useSingleFlight())
    const pending = deferred()
    const fn = vi.fn(() => pending.promise)

    const running = result.current(fn)
    void result.current(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    pending.resolve()
    await running
  })

  it('runs again once the previous call settles', async () => {
    const { result } = renderHook(() => useSingleFlight())
    const fn = vi.fn(async () => {})

    await result.current(fn)
    await result.current(fn)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('releases the guard when the call fails', async () => {
    const { result } = renderHook(() => useSingleFlight())
    const fn = vi.fn(async () => {})

    await expect(
      result.current(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom')
    await result.current(fn)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('guards each hook instance on its own', async () => {
    const a = renderHook(() => useSingleFlight())
    const b = renderHook(() => useSingleFlight())
    const pending = deferred()
    const fn = vi.fn(() => pending.promise)

    const running = a.result.current(() => pending.promise)
    void b.result.current(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    pending.resolve()
    await running
  })

  it('hands back what the call resolved to', async () => {
    const { result } = renderHook(() => useSingleFlight())

    await expect(result.current(async () => 42)).resolves.toBe(42)
  })

  it('resolves a dropped call to undefined', async () => {
    const { result } = renderHook(() => useSingleFlight())
    const pending = deferred()

    const running = result.current(() => pending.promise)
    await expect(result.current(async () => 42)).resolves.toBeUndefined()

    pending.resolve()
    await running
  })

  it('keeps the same function across renders', () => {
    const { result, rerender } = renderHook(() => useSingleFlight())
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
