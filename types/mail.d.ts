export interface EmailProps {
  email: string
  username?: string
  redirectUrl?: string
}

export interface WelcomeEmailProps extends EmailProps {
  trialDays: string
}

export interface ResetPasswordEmailProps extends EmailProps {}

export interface VerifyEmailOtpProps extends EmailProps {
  validationCode: string
}

export interface Verify2faAccessOtpProps extends EmailProps {
  validationCode: string
}

export interface InviteUserToWorkspaceProps extends EmailProps {
  inviterName: string
  inviterEmail: string
  inviterImage?: string
  workspaceName: string
  workspaceImage?: string
}

export interface TrialEndPromotionProps extends EmailProps {
  workspaceName: string
  trialEndDate: string
  daysRemaining: string
  couponCode: string
  discountLabel: string
  itemsCreated: number
}

export interface PostMortemProps extends EmailProps {
  incidentTitle: string
  incidentDate: string
  incidentId: string
  resume: string[]
}

export interface InactiveUserProps extends EmailProps { }

export interface InactiveWorkItemProps extends EmailProps { }

export interface InactiveWorkspaceProps extends EmailProps { }

export interface DeleteAccountProps extends EmailProps {
  scheduledDeletionDate: string
}

export interface ExportDataProps extends EmailProps {
  downloadUrl: string
  expiresAt: string
  fileSize?: string
}

export interface TalkToSalesEmailProps {
  name: string
  email: string
  teamSize: string
  message: string
}
