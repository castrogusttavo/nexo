'use server'

import { InactiveWorkspace } from '@/components/emails/behavior/inactive-workspace'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { InactiveWorkspaceProps } from '@/types/mail'

export async function sendInactiveWorkspaceEmail({
  email,
  username,
  redirectUrl,
}: InactiveWorkspaceProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Seu workspace ainda está vazio',
    react: InactiveWorkspace({
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
