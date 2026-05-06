'use server'

import { PostMortem } from '@/components/emails/post-mortem'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { sendEmail } from '@/src/lib/mail/send'
import type { PostMortemProps } from '@/types/mail'

export async function sendPostMortemEmail({
  email,
  incidentTitle,
  incidentDate,
  incidentId,
  resume,
}: PostMortemProps) {
  return sendEmail({
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
}
