import { ResetPasswordEmail } from '@/components/emails/user/reset-password'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { ResetPasswordEmailProps } from '@/types/mail'

export async function sendResetPasswordEmail({
  email,
  username,
  redirectUrl,
}: ResetPasswordEmailProps) {
  return sendEmail({
    to: [email],
    subject: 'Redefinir sua senha',
    react: ResetPasswordEmail({
      email,
      username,
      redirectUrl: redirectUrl ?? NEXT_PUBLIC_URL,
    }),
  })
}
