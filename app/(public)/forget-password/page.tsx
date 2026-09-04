import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/src/lib/auth'
import { ForgetPasswordForm } from './forget-password-form'

export const metadata: Metadata = {
  title: 'Redefinir senha | Nexo',
  description: 'Receba um link para redefinir a senha da sua conta no Nexo.',
  robots: { index: false, follow: false },
}

export default async function ForgetPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/')
  return <ForgetPasswordForm />
}
