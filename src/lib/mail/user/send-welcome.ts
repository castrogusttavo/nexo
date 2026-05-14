import { WelcomeEmail } from '@/components/emails/user/welcome'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { WelcomeEmailProps } from '@/types/mail'

export async function sendWelcomeEmail({
  email,
  username,
  trialDays,
}: WelcomeEmailProps) {
  return sendEmail({
    to: [email],
    subject: 'Welcome Nexo',
    react: WelcomeEmail({
      email,
      username,
      redirectUrl: NEXT_PUBLIC_URL,
      trialDays,
    }),
  })
}
