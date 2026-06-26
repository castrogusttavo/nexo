import InviteUserToWorkspace from '@/components/emails/workspace/invite-user-to-workspace'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import type { InviteUserToWorkspaceProps } from '@/types/mail'
import { sendEmail } from '../send'

export async function sendInviteUserToWorkspaceEmail({
  email,
  redirectUrl,
  inviterName,
  inviterEmail,
  inviterImage,
  workspaceName,
  workspaceImage,
}: InviteUserToWorkspaceProps) {
  return sendEmail({
    to: [email],
    subject: `Junte-se À ${workspaceName} no Nexo`,
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
}
