'use server'

import { InactiveWorkItem } from '@/components/emails/behavior/inactive-work-item'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { InactiveWorkItemProps } from '@/types/mail'

export async function sendInactiveWorkItemEmail({
  email,
  username,
  redirectUrl,
}: InactiveWorkItemProps) {
  return sendEmail({
    to: [email],
    subject: 'Você começou algo no Nexo — continue de onde parou',
    react: InactiveWorkItem({
      email,
      username,
      redirectUrl: redirectUrl ?? NEXT_PUBLIC_URL,
    }),
  })
}
