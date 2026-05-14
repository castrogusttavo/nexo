import { ExportData } from '@/components/emails/user/export-data'
import { sendEmail } from '@/src/lib/mail/send'
import type { ExportDataProps } from '@/types/mail'

export async function sendExportDataEmail({
  email,
  username,
  downloadUrl,
  expiresAt,
  fileSize,
}: ExportDataProps) {
  return sendEmail({
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
}
