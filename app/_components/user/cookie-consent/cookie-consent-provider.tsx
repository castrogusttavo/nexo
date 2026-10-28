'use client'

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useLogger } from '@/lib/axiom/client'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  type CookieConsent,
  parseCookieConsent,
} from '@/lib/cookie-consent/types'
import { apiSend } from '@/src/hooks/_fetch'
import { authClient } from '@/src/lib/auth-client'

interface CookieConsentCtx {
  consent: CookieConsent
  /**
   * False until the consent cookie has been read in the browser. The banner
   * waits for it, so a visitor who already decided never sees it flash.
   */
  ready: boolean
  isAuthenticated: boolean
  /**
   * The signed-in user's id, or `null`. Read by the consented trackers so
   * PostHog can attach events to an account without any other profile field
   * ever reaching it.
   */
  userId: string | null
  setConsent: (next: 'accepted' | 'rejected') => void
}

const Ctx = createContext<CookieConsentCtx | null>(null)

interface SessionState {
  isAuthenticated: boolean
  userId: string | null
}

interface ProviderProps {
  /**
   * Known consent, for tests and server-rendered islands. Omitted in the root
   * layout, where the cookie is read in the browser after mount.
   */
  initial?: CookieConsent
  /**
   * Known session. Omitted in the root layout, where it comes from Better
   * Auth's client session instead.
   */
  isAuthenticated?: boolean
  userId?: string | null
  children: ReactNode
}

function readConsentCookie(): CookieConsent {
  const prefix = `${COOKIE_NAME}=`
  const entry = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
  return parseCookieConsent(entry?.slice(prefix.length))
}

// The root layout used to await cookies() and getSession() above every page,
// which made every route render on each request (a public page cost ~4x the
// CPU of an API call, 2026-10-16). Reading both in the browser instead lets
// the marketing pages be prerendered as static HTML.
export function CookieConsentProvider({
  initial,
  isAuthenticated,
  userId = null,
  children,
}: ProviderProps) {
  const log = useLogger()
  const [consent, setConsentState] = useState<CookieConsent>(initial ?? null)
  const [ready, setReady] = useState(initial !== undefined)
  const [session, setSession] = useState<SessionState>({
    isAuthenticated: isAuthenticated ?? false,
    userId,
  })

  useEffect(() => {
    if (initial !== undefined) return
    setConsentState(readConsentCookie())
    setReady(true)
  }, [initial])

  const setConsent = useCallback(
    (next: 'accepted' | 'rejected') => {
      // biome-ignore lint/suspicious/noDocumentCookie: first-party persistent cookie set client-side by the banner; same pattern as components/ui/sidebar.tsx.
      document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
      setConsentState(next)
      if (session.isAuthenticated) {
        // Fire-and-forget: the cookie is authoritative for the client; the
        // server call only writes the LGPD audit trail, so a failure never
        // changes the user's experience. It is logged, though: a refused
        // write (fetch does not reject on 4xx/5xx) used to leave a gap in
        // the trail with no trace. keepalive lets it finish when the user
        // navigates right after answering the banner.
        apiSend('/api/users/me/cookie-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accepted: next === 'accepted' }),
          keepalive: true,
        }).catch((error: unknown) => {
          log.warn('cookie_consent.audit_failed', {
            component: 'CookieConsentProvider',
            message: error instanceof Error ? error.message : String(error),
          })
        })
      }
    },
    [session.isAuthenticated, log],
  )

  return (
    <Ctx.Provider
      value={{
        consent,
        ready,
        isAuthenticated: session.isAuthenticated,
        userId: session.userId,
        setConsent,
      }}
    >
      {children}
      {isAuthenticated === undefined && <SessionBridge onChange={setSession} />}
    </Ctx.Provider>
  )
}

// Rendered only when the session was not handed in: subscribes to Better
// Auth's client session and reports who is signed in.
function SessionBridge({
  onChange,
}: {
  onChange: (session: SessionState) => void
}) {
  const { data } = authClient.useSession()
  const userId = data?.user.id ?? null

  useEffect(() => {
    onChange({ isAuthenticated: userId !== null, userId })
  }, [onChange, userId])

  return null
}

export function useCookieConsent(): CookieConsentCtx {
  const ctx = use(Ctx)
  if (!ctx) {
    throw new Error(
      'useCookieConsent must be used inside <CookieConsentProvider>',
    )
  }
  return ctx
}
