'use client'

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useState,
} from 'react'
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  type CookieConsent,
} from '@/lib/cookie-consent/types'

interface CookieConsentCtx {
  consent: CookieConsent
  isAuthenticated: boolean
  setConsent: (next: 'accepted' | 'rejected') => void
}

const Ctx = createContext<CookieConsentCtx | null>(null)

interface ProviderProps {
  initial: CookieConsent
  isAuthenticated: boolean
  children: ReactNode
}

export function CookieConsentProvider({
  initial,
  isAuthenticated,
  children,
}: ProviderProps) {
  const [consent, setConsentState] = useState<CookieConsent>(initial)

  const setConsent = useCallback(
    (next: 'accepted' | 'rejected') => {
      // biome-ignore lint/suspicious/noDocumentCookie: first-party persistent cookie set client-side by the banner; same pattern as components/ui/sidebar.tsx.
      document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
      setConsentState(next)
      if (isAuthenticated) {
        // Fire-and-forget: cookie is authoritative for the client; the
        // server call only writes the audit trail. Failure here doesn't
        // change the user's experience.
        void fetch('/api/users/me/cookie-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accepted: next === 'accepted' }),
        }).catch(() => {})
      }
    },
    [isAuthenticated],
  )

  return (
    <Ctx.Provider value={{ consent, isAuthenticated, setConsent }}>
      {children}
    </Ctx.Provider>
  )
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
