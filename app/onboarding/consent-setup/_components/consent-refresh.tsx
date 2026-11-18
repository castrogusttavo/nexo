'use client'

import { useEffect } from 'react'
import { authClient } from '@/src/lib/auth-client'

// Consent was accepted elsewhere while this browser still holds a cookie cache
// from before it, which the proxy reads as "no consent". Re-issue the cache
// from the database, then leave with a full navigation so no router cache
// replays the old answer.
export function ConsentRefresh({ to }: { to: string }) {
  useEffect(() => {
    authClient
      .getSession({ query: { disableCookieCache: true } })
      .finally(() => window.location.replace(to))
  }, [to])

  return null
}
