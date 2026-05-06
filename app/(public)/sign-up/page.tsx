import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/src/lib/auth'
import { SignUpForm } from './sign-up-form'

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/')
  return <SignUpForm />
}
