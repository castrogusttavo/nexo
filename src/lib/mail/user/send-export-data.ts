'use server'

import { ExportData } from '@/components/emails/user/export-data'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { ExportDataProps } from '@/types/mail'

export async function sendExportDataEmail({
  email,
  username,
  downloadUrl,
  expiresAt,
  fileSize,
}: ExportDataProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Seus dados estão prontos para download',
    react: ExportData({
      email,
      username,
      downloadUrl,
      expiresAt,
      fileSize,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
