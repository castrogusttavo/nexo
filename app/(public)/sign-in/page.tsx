import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/src/lib/auth'
import { SIGNED_IN_HOME, safeRedirectPath } from '@/src/lib/safe-redirect'
import { SignInForm } from './sign-in-form'

export const metadata: Metadata = {
  title: 'Entrar | Nexo',
  description: 'Acesse sua conta no Nexo.',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ redirect?: string }>

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

// The redirect target and the "already signed in" check both need the
// request, so they run inside a boundary: read at the page root they blocked
// the route's prerender and every navigation into it (Cache Components).
export default function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense>
      <SignIn searchParams={searchParams} />
    </Suspense>
  )
}

async function SignIn({ searchParams }: { searchParams: SearchParams }) {
  const { redirect: redirectParam } = await searchParams
  const redirectTo = safeRedirectPath(redirectParam) ?? SIGNED_IN_HOME

  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect(redirectTo)

  return <SignInForm redirectTo={redirectTo} />
}
