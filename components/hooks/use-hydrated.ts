'use client'

import { useSyncExternalStore } from 'react'

// Module-scoped so their identities stay stable: an inline getSnapshot is the
// classic cause of an infinite re-subscribe loop.
const subscribeToNothing = () => () => {}
const getHydrated = () => true
const getServerHydrated = () => false

// `false` while rendering on the server and while hydrating, `true` once the
// component is mounted in the browser. Gate anything that differs between
// the two (the clock, the viewer's time zone, `document`) behind it, so the
// first client render matches the server HTML. Unlike a mount effect, it
// costs no extra render pass.
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    getHydrated,
    getServerHydrated,
  )
}
