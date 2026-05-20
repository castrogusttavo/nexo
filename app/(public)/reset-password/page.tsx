import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Nova senha | Nexo',
  description: 'Defina uma nova senha para sua conta no Nexo.',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string | string[]
    error?: string | string[]
  }>
}) {
  const params = await searchParams
  // Next.js may surface a repeated query param as an array; the form expects a
  // single value, so collapse to the first element.
  const token = Array.isArray(params.token) ? params.token[0] : params.token
  const error = Array.isArray(params.error) ? params.error[0] : params.error
  return <ResetPasswordForm token={token} linkError={error} />
}
