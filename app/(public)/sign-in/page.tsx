import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/src/lib/auth'
import { SignInForm } from './sign-in-form'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/')
  return <SignInForm />
}
