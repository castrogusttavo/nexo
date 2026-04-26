'use server'

import { InactiveUser } from '@/components/emails/behavior/inactive-user'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { InactiveUserProps } from '@/types/mail'

export async function sendInactiveUserEmail({
  email,
  username,
  redirectUrl,
}: InactiveUserProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Senti sua falta por aqui',
    react: InactiveUser({
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
