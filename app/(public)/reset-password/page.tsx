import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Nova senha | Nexo',
  description: 'Defina uma nova senha para sua conta no Nexo.',
  robots: { index: false, follow: false },
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type SearchParams = Promise<{
  token?: string | string[]
  error?: string | string[]
}>

// The token comes from the URL, so the form waits inside the boundary.
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense>
      <ResetPassword searchParams={searchParams} />
    </Suspense>
  )
}

async function ResetPassword({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  // Next.js may surface a repeated query param as an array; the form expects a
  // single value, so collapse to the first element.
  const token = Array.isArray(params.token) ? params.token[0] : params.token
  const error = Array.isArray(params.error) ? params.error[0] : params.error
  return <ResetPasswordForm token={token} linkError={error} />
}
