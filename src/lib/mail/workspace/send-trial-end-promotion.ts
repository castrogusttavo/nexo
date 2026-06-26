import { TrialEndPromotion } from '@/components/emails/workspace/trial-end-promotion'
import type { TrialEndPromotionProps } from '@/types/mail'
import { sendEmail } from '../send'

export async function sendTrialEndPromotionEmail({
  email,
  username,
  workspaceName,
  trialEndDate,
  daysRemaining,
  couponCode,
  discountLabel,
  itemsCreated,
}: TrialEndPromotionProps) {
  return sendEmail({
    to: [email],
    subject: `Seu trial acaba em ${daysRemaining} dias`,
    react: TrialEndPromotion({
      email,
      username,
      workspaceName,
      trialEndDate,
      daysRemaining,
      couponCode,
      discountLabel,
      itemsCreated,
    }),
  })
}
