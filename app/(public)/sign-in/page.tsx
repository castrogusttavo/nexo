import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/src/lib/auth'
import { SignInForm } from './sign-in-form'

export const metadata: Metadata = {
  title: 'Entrar | Nexo',
  description: 'Acesse sua conta no Nexo.',
}

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/')
  return <SignInForm />
}
