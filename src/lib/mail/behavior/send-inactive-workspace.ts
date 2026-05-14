import { InactiveWorkspace } from '@/components/emails/behavior/inactive-workspace'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { InactiveWorkspaceProps } from '@/types/mail'

export async function sendInactiveWorkspaceEmail({
  email,
  username,
  redirectUrl,
}: InactiveWorkspaceProps) {
  return sendEmail({
    to: [email],
    subject: 'Seu workspace ainda está vazio',
    react: InactiveWorkspace({
      email,
      username,
      redirectUrl: redirectUrl ?? NEXT_PUBLIC_URL,
    }),
  })
}
