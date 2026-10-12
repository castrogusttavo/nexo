import { useCallback, useRef } from 'react'

// Drops a call while the previous one is still running, resolving it to
// `undefined`. A ref, not `mutation.isPending`: state only updates on the next
// render, so two clicks in the same tick would both get through.
export function useSingleFlight() {
  const running = useRef(false)

  return useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (running.current) return undefined
      running.current = true
      try {
        return await fn()
      } finally {
        running.current = false
      }
    },
    [],
  )
}
