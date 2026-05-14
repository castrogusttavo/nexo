import { InviteUserToWorkspace } from '@/components/emails/workspace/invite-user-to-workspace'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { InviteUserToWorkspaceProps } from '@/types/mail'

export async function sendInviteUserToWorkspaceEmail({
  email,
  redirectUrl,
  inviterName,
  inviterEmail,
  inviterImage,
  workspaceName,
  workspaceImage,
}: InviteUserToWorkspaceProps) {
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: `Junte-se à ${workspaceName} no Nexo`,
    react: InviteUserToWorkspace({
      email,
      redirectUrl: redirectUrl ?? NEXT_PUBLIC_URL,
      inviterName,
      inviterEmail,
      inviterImage,
      workspaceName,
      workspaceImage,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
