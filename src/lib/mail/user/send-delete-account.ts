import { DeleteAccount } from '@/components/emails/user/delete-account'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { DeleteAccountProps } from '@/types/mail'

export async function sendDeleteAccountEmail({
  email,
  username,
  scheduledDeletionDate,
  redirectUrl,
}: DeleteAccountProps) {
  return sendEmail({
    to: [email],
    subject: `Sua conta será excluída em ${scheduledDeletionDate}`,
    react: DeleteAccount({
      email,
      username,
      scheduledDeletionDate,
      redirectUrl: redirectUrl ?? `${NEXT_PUBLIC_URL}/account/cancel-deletion`,
    }),
  })
}
