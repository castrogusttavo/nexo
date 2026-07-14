import CareerApplicationEmail from '@/components/emails/careers/career-application'
import type { CareerApplicationEmailProps } from '@/types/mail'
import { sendEmail } from '../send'
import { mailAddresses, mailSenders } from '../senders'

export async function sendCareerApplicationEmail(
  params: CareerApplicationEmailProps,
) {
  return sendEmail({
    to: [mailAddresses.careers],
    from: mailSenders.notifications,
    replyTo: params.email,
    subject: `Nova candidatura - ${params.jobTitle} - ${params.name}`,
    react: CareerApplicationEmail(params),
  })
}
