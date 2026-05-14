import { InactiveUser } from '@/components/emails/behavior/inactive-user'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { InactiveUserProps } from '@/types/mail'

export async function sendInactiveUserEmail({
  email,
  username,
  redirectUrl,
}: InactiveUserProps) {
  return sendEmail({
    to: [email],
    subject: 'Senti sua falta por aqui',
    react: InactiveUser({
      email,
      username,
      redirectUrl: redirectUrl ?? NEXT_PUBLIC_URL,
    }),
  })
}
