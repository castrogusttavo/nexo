'use server'

import { VerifyEmailWithOtpEmail } from '@/components/emails/user/verify-email-with-otp'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { VerifyEmailOtpProps } from '@/types/mail'

export async function sendVerifyEmailWithOtpEmail({
  email,
  username,
  validationCode,
}: VerifyEmailOtpProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Confirme seu e-mail',
    react: VerifyEmailWithOtpEmail({
      email,
      username,
      redirectUrl: NEXT_PUBLIC_URL,
      validationCode,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
