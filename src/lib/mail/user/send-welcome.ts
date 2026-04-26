'use server'

import { WelcomeEmail } from '@/components/emails/user/welcome'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { WelcomeEmailProps } from '@/types/mail'

export async function sendWelcomeEmail({
  email,
  username,
  trialDays,
}: WelcomeEmailProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Welcome Nexo',
    react: WelcomeEmail({
      email,
      username,
      redirectUrl: NEXT_PUBLIC_URL,
      trialDays,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
