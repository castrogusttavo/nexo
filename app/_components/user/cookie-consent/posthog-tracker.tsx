'use client'

import { useEffect } from 'react'
import { loadPostHog } from '@/lib/posthog/client'

interface PostHogTrackerProps {
  /**
   * The signed-in user's id, or `null` for an anonymous visitor. This is the
   * only identifier that ever reaches PostHog: no e-mail, no name, no
   * username -- the same rule `auditMutation` follows with `actorId`.
   */
  userId: string | null
}

/**
 * Loads PostHog and keeps its identity in sync with the session.
 *
 * Renders nothing and is mounted only by `<ConsentedTrackers />`, i.e. only
 * after the visitor accepted analytics cookies. With no
 * `NEXT_PUBLIC_POSTHOG_KEY` configured, `loadPostHog()` resolves to `null` and
 * the SDK chunk is never fetched.
 */
export function PostHogTracker({ userId }: PostHogTrackerProps) {
  useEffect(() => {
    let cancelled = false

    void loadPostHog().then((posthog) => {
      if (cancelled || !posthog) return
      if (userId) {
        // No property bag: identify(id) alone links the events to the account
        // without copying any profile field into PostHog.
        if (posthog.get_distinct_id() !== userId) posthog.identify(userId)
        return
      }
      // Signing out has to drop the identified distinct id, otherwise the
      // next person on this browser inherits the previous user's profile.
      if (posthog._isIdentified()) posthog.reset()
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  return null
}
