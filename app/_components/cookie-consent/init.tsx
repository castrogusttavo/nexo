import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'
import { COOKIE_NAME, parseCookieConsent } from '@/lib/cookie-consent/types'
import { auth } from '@/src/lib/auth'
import { CookieConsentProvider } from './provider'

// Server component: reads the consent cookie and the current session
// once, then hands them to the client provider. Kept as its own RSC so
// the cookies()/headers() calls land inside the layout's <Suspense>
// (Next's Cache Components warns when they run at the layout root).

export async function CookieConsentInit({ children }: { children: ReactNode }) {
  const [cookieStore, session] = await Promise.all([
    cookies(),
    auth.api.getSession({ headers: await headers() }),
  ])
  const initial = parseCookieConsent(cookieStore.get(COOKIE_NAME)?.value)

  return (
    <CookieConsentProvider initial={initial} isAuthenticated={!!session}>
      {children}
    </CookieConsentProvider>
  )
}
