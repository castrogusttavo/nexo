import { APIError } from 'better-auth'
import { describe, expect, it, vi } from 'vitest'
import { createVerifyGate } from '../auth-concurrency-gate'

describe('createVerifyGate()', () => {
  it('should admit immediately while under the concurrency limit', async () => {
    const gate = createVerifyGate({
      maxConcurrent: 2,
      maxQueueDepth: 5,
      maxQueueWaitMs: 1000,
    })

    const release1 = await gate.acquireVerifySlot()
    const release2 = await gate.acquireVerifySlot()

    expect(release1).toBeInstanceOf(Function)
    expect(release2).toBeInstanceOf(Function)
  })

  it('should queue a request beyond the limit and admit it once a slot is released', async () => {
    const gate = createVerifyGate({
      maxConcurrent: 1,
      maxQueueDepth: 5,
      maxQueueWaitMs: 1000,
    })
    const release1 = await gate.acquireVerifySlot()

    let admitted = false
    const pending = gate.acquireVerifySlot().then((release) => {
      admitted = true
      return release
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(admitted).toBe(false)

    release1()
    const release2 = await pending

    expect(admitted).toBe(true)
    expect(release2).toBeInstanceOf(Function)
  })

  it('should reject with a 429 APIError when the queue is full', async () => {
    const gate = createVerifyGate({
      maxConcurrent: 1,
      maxQueueDepth: 1,
      maxQueueWaitMs: 1000,
    })

    await gate.acquireVerifySlot() // occupies the only slot
    const queued = gate.acquireVerifySlot() // fills the only queue slot
    queued.catch(() => {}) // never settles in this test; avoid an unhandled rejection

    await expect(gate.acquireVerifySlot()).rejects.toMatchObject({
      statusCode: 429,
      body: expect.objectContaining({ code: 'RATE_LIMITED' }),
    })
  })

  it('should reject with a 429 APIError when the queue wait times out', async () => {
    vi.useFakeTimers()
    try {
      const gate = createVerifyGate({
        maxConcurrent: 1,
        maxQueueDepth: 5,
        maxQueueWaitMs: 1000,
      })

      await gate.acquireVerifySlot() // occupies the only slot, never released
      const assertion = expect(gate.acquireVerifySlot()).rejects.toMatchObject({
        statusCode: 429,
      })

      await vi.advanceTimersByTimeAsync(1000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('should set the Retry-After header on rejection', async () => {
    const gate = createVerifyGate({
      maxConcurrent: 0,
      maxQueueDepth: 0,
      maxQueueWaitMs: 1000,
    })

    try {
      await gate.acquireVerifySlot()
      expect.unreachable('acquireVerifySlot should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(APIError)
      expect((error as APIError).headers).toMatchObject({ 'Retry-After': '3' })
    }
  })

  it('should free the queue slot after a timeout, letting a new request queue up', async () => {
    vi.useFakeTimers()
    try {
      const gate = createVerifyGate({
        maxConcurrent: 1,
        maxQueueDepth: 1,
        maxQueueWaitMs: 1000,
      })

      await gate.acquireVerifySlot() // occupies the only slot, never released

      const firstQueued = expect(
        gate.acquireVerifySlot(),
      ).rejects.toMatchObject({
        statusCode: 429,
      })
      await vi.advanceTimersByTimeAsync(1000)
      await firstQueued

      // If the timed-out entry had leaked in the queue, this would reject
      // synchronously ("queue full") instead of actually queuing again.
      let settled = false
      const secondCall = gate.acquireVerifySlot().catch(() => {
        settled = true
      })
      await Promise.resolve() // let any synchronous rejection land first
      expect(settled).toBe(false)

      await vi.advanceTimersByTimeAsync(1000)
      await secondCall
      expect(settled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
