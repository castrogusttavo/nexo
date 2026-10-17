import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/src/lib/auth'
import { SIGNED_IN_HOME, safeRedirectPath } from '@/src/lib/safe-redirect'
import { SignUpForm } from './sign-up-form'

export const metadata: Metadata = {
  title: 'Criar conta | Nexo',
  description:
    'Crie sua conta no Nexo e comece a trabalhar em todas as dimensões.',
  robots: { index: false, follow: false },
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type SearchParams = Promise<{ redirect?: string }>

// Same shape as /sign-in: the redirect target and the "already signed in"
// check need the request, so they run inside a boundary instead of blocking
// the route.
export default function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense>
      <SignUp searchParams={searchParams} />
    </Suspense>
  )
}

async function SignUp({ searchParams }: { searchParams: SearchParams }) {
  const { redirect: redirectParam } = await searchParams
  const redirectTo = safeRedirectPath(redirectParam) ?? SIGNED_IN_HOME

  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect(redirectTo)

  return <SignUpForm redirectTo={redirectTo} />
}
