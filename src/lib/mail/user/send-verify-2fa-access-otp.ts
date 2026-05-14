import { Verify2faAccessOtp } from '@/components/emails/user/verify-2fa-access-otp'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { Verify2faAccessOtpProps } from '@/types/mail'

export async function sendVerify2faAccessOtp({
  email,
  username,
  validationCode,
}: Verify2faAccessOtpProps) {
  return sendEmail({
    to: [email],
    subject: 'Seu código de acesso ao Nexo',
    react: Verify2faAccessOtp({
      email,
      username,
      redirectUrl: NEXT_PUBLIC_URL,
      validationCode,
    }),
  })
}
