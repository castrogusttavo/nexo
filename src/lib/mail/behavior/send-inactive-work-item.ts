'use server'

import { InactiveWorkItem } from '@/components/emails/behavior/inactive-work-item'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { InactiveWorkItemProps } from '@/types/mail'

export async function sendInactiveWorkItemEmail({
  email,
  username,
  redirectUrl,
}: InactiveWorkItemProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Você começou algo no Nexo — continue de onde parou',
    react: InactiveWorkItem({
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
