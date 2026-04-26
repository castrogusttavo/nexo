'use server'

import { DeleteAccount } from '@/components/emails/user/delete-account'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { DeleteAccountProps } from '@/types/mail'

export async function sendDeleteAccountEmail({
  email,
  username,
  scheduledDeletionDate,
  redirectUrl,
}: DeleteAccountProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: `Sua conta será excluída em ${scheduledDeletionDate}`,
    react: DeleteAccount({
      email,
      username,
      scheduledDeletionDate,
      redirectUrl: redirectUrl ?? `${NEXT_PUBLIC_URL}/account/cancel-deletion`,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
