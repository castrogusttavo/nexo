import { VerifyEmailWithOtp } from '@/components/emails/user/verify-email-with-otp'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { VerifyEmailOtpProps } from '@/types/mail'

export async function sendVerifyEmailWithOtp({
  email,
  username,
  validationCode,
}: VerifyEmailOtpProps) {
  return sendEmail({
    to: [email],
    subject: 'Confirme seu e-mail',
    react: VerifyEmailWithOtp({
      email,
      username,
      redirectUrl: NEXT_PUBLIC_URL,
      validationCode,
    }),
  })
}
