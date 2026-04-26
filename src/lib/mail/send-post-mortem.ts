'use server'

import { PostMortem } from '@/components/emails/post-mortem'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { PostMortemProps } from '@/types/mail'

export async function sendPostMortemEmail({
  email,
  incidentTitle,
  incidentDate,
  incidentId,
  resume,
}: PostMortemProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: `Nexo | ${incidentTitle}`,
    react: PostMortem({
      email,
      incidentTitle,
      incidentDate,
      incidentId,
      resume,
      redirectUrl: `${NEXT_PUBLIC_URL}/incidents`,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
