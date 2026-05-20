import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Nova senha | Nexo',
  description: 'Defina uma nova senha para sua conta no Nexo.',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams
  return <ResetPasswordForm token={token} linkError={error} />
}
