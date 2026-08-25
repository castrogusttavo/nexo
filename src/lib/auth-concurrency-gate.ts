import { APIError } from 'better-auth'
import {
  AUTH_VERIFY_CONCURRENCY,
  AUTH_VERIFY_QUEUE_DEPTH,
  AUTH_VERIFY_QUEUE_WAIT_MS,
} from '@/lib/env/_server'

const RETRY_AFTER_SECONDS = 3

export function overloadedError() {
  return new APIError(
    'TOO_MANY_REQUESTS',
    {
      message: 'Muitos acessos agora, tente novamente em instantes',
      code: 'RATE_LIMITED',
      retryAfterSeconds: RETRY_AFTER_SECONDS,
    },
    { 'Retry-After': String(RETRY_AFTER_SECONDS) },
  )
}

export function createVerifyGate(options: {
  maxConcurrent: number
  maxQueueDepth: number
  maxQueueWaitMs: number
}) {
  let active = 0
  const queue: Array<{ settle: (admitted: boolean) => void }> = []

  function admitNext() {
    if (active >= options.maxConcurrent) return
    const entry = queue.shift()
    if (!entry) return
    active++
    entry.settle(true)
  }

  function release() {
    active--
    admitNext()
  }

  async function acquireVerifySlot(): Promise<() => void> {
    if (active < options.maxConcurrent) {
      active++
      return release
    }

    if (queue.length >= options.maxQueueDepth) {
      throw overloadedError()
    }

    const admitted = await new Promise<boolean>((resolve) => {
      let settled = false
      const settle = (ok: boolean) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(ok)
      }
      const entry = { settle }
      queue.push(entry)
      const timer = setTimeout(() => {
        const idx = queue.indexOf(entry)
        if (idx !== -1) queue.splice(idx, 1)
        settle(false)
      }, options.maxQueueWaitMs)
    })

    if (!admitted) throw overloadedError()
    return release
  }

  return { acquireVerifySlot }
}

const defaultGate = createVerifyGate({
  maxConcurrent: AUTH_VERIFY_CONCURRENCY,
  maxQueueDepth: AUTH_VERIFY_QUEUE_DEPTH,
  maxQueueWaitMs: AUTH_VERIFY_QUEUE_WAIT_MS,
})

export const acquireVerifySlot = defaultGate.acquireVerifySlot
