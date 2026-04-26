'use server'

import { ResetPasswordEmail } from '@/components/emails/user/reset-password'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { ResetPasswordEmailProps } from '@/types/mail'

export async function sendResetPasswordEmail({
  email,
  username,
  redirectUrl,
}: ResetPasswordEmailProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Redefinir sua senha',
    react: ResetPasswordEmail({
      email,
      username,
      redirectUrl: redirectUrl ?? NEXT_PUBLIC_URL,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
