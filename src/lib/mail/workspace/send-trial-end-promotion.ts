import { TrialEndPromotion } from '@/components/emails/workspace/trial-end-promotion'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import type { TrialEndPromotionProps } from '@/types/mail'

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
  const { data, error } = await resend.emails.send({
    from: defaultFrom,
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

  if (error) {
    throw new Error(error.message)
  }

  return data
}
